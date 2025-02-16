import {
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { assertNever } from "$lib/asserts"
import { auditJorfTexteVersion } from "$lib/auditors/jorf"
import { auditLegiArticle, auditLegiTexteVersion } from "$lib/auditors/legi"
import type {
  Source,
  ReferencesByTargetId,
  Versions,
  XmlHeader,
  SourceArticleTexte,
} from "$lib/legal"
import type {
  Jo,
  JorfArticle,
  JorfCategorieTag,
  JorfSectionTa,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { xmlParser } from "$lib/parsers/shared"
import config from "$lib/server/config"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  origines,
  type Origine,
} from "$lib/server/nodegit/commits"
import {
  readOidByIdTree,
  removeOidByIdTreeEmptyNodes,
  setOidInIdTree,
  writeOidByIdTree,
  type OidByIdTree,
} from "$lib/server/nodegit/trees"

const { forgejo } = config

function addOrRemoveReferenceToTarget(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  add: boolean, // false => remove
  source: Source,
  targetId: string,
) {
  let referencesToTarget = referencesByTargetId.get(targetId)
  if (add) {
    if (referencesToTarget === undefined) {
      referencesToTarget = { sources: [], targetId }
      referencesByTargetId.set(targetId, referencesToTarget)
    }
    if (
      referencesToTarget.sources.every(
        (existingSource) => existingSource.id !== source.id,
      )
    ) {
      referencesToTarget.sources.push(source)
    }
  } else if (referencesToTarget !== undefined) {
    // Remove reference from source to target.
    referencesToTarget.sources = referencesToTarget.sources.filter(
      (existingSource) => existingSource.id !== source.id,
    )
    if (referencesToTarget.sources.length === 0) {
      referencesByTargetId.delete(targetId)
    }
  }
  changedIds.add(targetId)
}

async function exportBackLinksToGit(
  dilaDir: string,
  {
    force,
    init,
    push,
    silent,
  }: {
    force?: boolean
    init?: string
    push?: boolean
    silent?: boolean
  } = {},
): Promise<number> {
  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  const exitCode = 0
  const [dilaStartDate, dilaStartDateError] = auditChain(
    auditTest(
      (value: string) => dilaDateRegExp.test(value),
      (value) => `Date not found in "${value}"`,
    ),
    auditFunction((value: string) => value.match(dilaDateRegExp)?.[0]),
    auditRequire,
  )(strictAudit, init) as [string, unknown]
  assert.strictEqual(
    dilaStartDateError,
    null,
    `Error in init option: ${JSON.stringify(dilaStartDate)}:\n${JSON.stringify(
      dilaStartDateError,
      null,
      2,
    )}`,
  )

  const sourceRepositoryByOrigine = Object.fromEntries(
    await Promise.all(
      origines.map(async (origine) => [
        origine,
        await nodegit.Repository.open(
          path.join(dilaDir, origine.toLowerCase(), ".git"),
        ),
      ]),
    ),
  )
  const targetGitDir = path.join(dilaDir, "liens_donnees_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  const referencesByTargetId: ReferencesByTargetId = new Map()
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<Origine, nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  const targetOidByIdTree: OidByIdTree = new Map()
  const texteInfosById: Map<string, SourceArticleTexte> = new Map()
  for await (const {
    dilaDate,
    sourceCommitByOrigine,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryByOrigine, true)) {
    if (skip) {
      if (dilaDate >= dilaStartDate) {
        skip = false
      } else {
        continue
      }
    }

    // The first time that this part of the loop is reached,
    // find the commit of target to use as base for future
    // target commits.
    if (!targetBaseCommitFound) {
      let targetBaseCommitOid: nodegit.Oid | undefined
      for await (targetBaseCommitOid of iterCommitsOids(
        targetRepository,
        false,
      )) {
        const targetBaseCommit =
          await targetRepository.getCommit(targetBaseCommitOid)
        const targetBaseCommitMessage = targetBaseCommit.message()
        if (targetBaseCommitMessage === dilaDate) {
          targetBaseCommitFound = true
          targetBaseCommitOid = targetBaseCommit.parents()[0]
          break
        }
      }
      if (!targetBaseCommitFound) {
        targetBaseCommitFound = true
        targetBaseCommitOid = undefined
      }
      if (targetBaseCommitOid !== undefined) {
        // Start targetCommitsOidsIterator at targetBaseCommitOid.
        for await (targetCommitOid of targetCommitsOidsIterator) {
          if (targetCommitOid.equal(targetBaseCommitOid)) {
            break
          }
        }
      }
    }

    const targetExistingCommitOid = targetCommitOid
    if (!force && !targetCommitsOidsIterationsDone) {
      // If a target commit already exists for this source commit, reuse it.
      const { done, value } = await targetCommitsOidsIterator.next()
      if (done) {
        targetCommitsOidsIterationsDone = true
      } else {
        targetCommitOid = value
        const targetCommit = await targetRepository.getCommit(targetCommitOid)
        const targetCommitMessage = targetCommit.message()
        if (targetCommitMessage !== dilaDate) {
          console.warn(
            `Unexpected target commit message "${targetCommitMessage}", not matching date of source commits ${dilaDate}`,
          )
          targetCommitsOidsIterationsDone = true
        } else {
          continue
        }
      }
      if (!silent) {
        console.log(`Resuming conversion at date ${dilaDate}…`)
      }
    }

    steps.push({
      label: "Extract references from legal objects",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const sourceTreeByOrigine: Record<Origine, nodegit.Tree> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(sourceCommitByOrigine).map(
            async ([origine, sourceCommit]) => [
              origine,
              await sourceCommit.getTree(),
            ],
          ),
        ),
      )
    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    const changedIds: Set<string> = new Set()
    for (const [origine, sourceTree] of Object.entries(
      sourceTreeByOrigine,
    ) as Array<[Origine, nodegit.Tree]>) {
      console.log(`Loading source ${origine}`)
      const sourcePreviousCommit = sourcePreviousCommitByOrigine?.[origine]
      const sourcePreviousTree = await sourcePreviousCommit?.getTree()
      await extractSourceTreeReferencesChanges(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        origine,
        sourcePreviousTree,
        sourceTree,
      )
    }

    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    // Add titles of texts to sources, when source is an article.
    steps.push({
      label: "Add title of texts to sources",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    for (const references of referencesByTargetId.values()) {
      for (const source of references.sources) {
        if (source.kind === "ARTICLE" && source.texte !== undefined) {
          const sourceTexteInfos = texteInfosById.get(source.texte.id)
          if (sourceTexteInfos !== undefined) {
            source.texte = sourceTexteInfos
          }
        }
      }
    }

    // Read oidByIdTree if it has not been read yet.
    if (targetOidByIdTree.size === 0) {
      steps.push({
        label: "Read oidByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      for (const [name, subOidByIdTree] of (
        await readOidByIdTree(targetRepository, targetExistingTree)
      ).entries()) {
        targetOidByIdTree.set(name, subOidByIdTree)
      }
    }

    // Update oidByIdTree with modified references.
    steps.push({
      label: "Update oidByIdTree with modified references",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    let commitChanged = false
    for (const targetId of changedIds) {
      const references = referencesByTargetId.get(targetId)
      if (
        setOidInIdTree(
          targetOidByIdTree,
          targetId,
          references === undefined
            ? undefined
            : await targetRepository.createBlobFromBuffer(
                Buffer.from(
                  JSON.stringify(
                    {
                      sources: references.sources.toSorted((source1, source2) =>
                        source1.id.localeCompare(source2.id),
                      ),
                      targetId,
                    },
                    null,
                    2,
                  ),
                  "utf-8",
                ),
              ),
        )
      ) {
        commitChanged = true
      }
    }
    if (!commitChanged) {
      // No change to commit.
      continue
    }

    // Cleanup oidByIdTree.
    steps.push({
      label: "Cleanup oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    removeOidByIdTreeEmptyNodes(targetOidByIdTree)

    // Write updated oidByIdTree.
    steps.push({
      label: "Write updated oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const targetTreeOid = await writeOidByIdTree(
      targetRepository,
      targetOidByIdTree,
      ".json",
    )
    if (targetTreeOid.tostrS() === targetExistingTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    // Commit changes.
    steps.push({
      label: "Commit changes",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const sourceAuthorWhen = sourceCommitByOrigine.JORF.author().when()
    const sourceCommitterWhen = sourceCommitByOrigine.JORF.committer().when()
    const targetCommitMessage = dilaDate
    if (!silent) {
      console.log(`New commit: ${targetCommitMessage}`)
    }
    targetCommitOid = await targetRepository.createCommit(
      "HEAD",
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        sourceAuthorWhen.time(),
        sourceAuthorWhen.offset(),
      ),
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        sourceCommitterWhen.time(),
        sourceCommitterWhen.offset(),
      ),
      targetCommitMessage,
      targetTreeOid,
      [targetExistingCommitOid].filter(
        (oid) => oid !== undefined,
      ) as nodegit.Oid[],
    )
    commitsChanged = true
  }

  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  if (commitsChanged) {
    await targetRepository.createBranch("main", targetCommitOid!, true)
    await targetRepository.setHead("refs/heads/main")

    if (forgejo !== undefined && push) {
      steps.push({
        label: "Push new commits",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      let targetRemote: nodegit.Remote
      try {
        targetRemote = await targetRepository.getRemote("origin")
      } catch (error) {
        if (
          (error as Error).message.includes("remote 'origin' does not exist")
        ) {
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/liens_donnees_juridiques.git`
          targetRemote = await nodegit.Remote.create(
            targetRepository,
            "origin",
            targetRemoteUrl,
          )
        } else {
          throw error
        }
      }
      const targetBranch = await targetRepository.getCurrentBranch()
      const targetBranchName = targetBranch.shorthand()
      const refspec = `+HEAD:refs/heads/${targetBranchName}` // "+" => force push
      await targetRemote.push([refspec], {
        callbacks: {
          credentials: (_url: string, username: string) => {
            return nodegit.Credential.sshKeyFromAgent(username)
          },
        },
      })
      await nodegit.Branch.setUpstream(
        targetBranch,
        `origin/${targetBranchName}`,
      )
    }
  }

  // console.log("Performance: ")
  // for (const [index, step] of steps.entries()) {
  //   console.log(
  //     `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
  //   )
  // }

  return exitCode
}

async function extractJorfObjectReferences(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteInfosById: Map<string, SourceArticleTexte>,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    JorfCategorieTag | "?xml",
    unknown,
  ][]) {
    switch (tag) {
      case "?xml": {
        break
      }

      case "ARTICLE": {
        // const [article, error] = auditChain(auditJorfArticle, auditRequire)(
        //   strictAudit,
        //   element,
        // ) as [JorfArticle, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for ARTICLE:\n${JSON.stringify(
        //     article,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "ID": {
        // const sourceEntryPath = sourceEntry.path()
        // const sourceEntrySplitPath = sourceEntryPath.split("/")
        // assert.strictEqual(sourceEntrySplitPath[0], "global")
        // assert.strictEqual(sourceEntrySplitPath[1], "eli")
        // // const eli = sourceEntrySplitPath.slice(2, -1).join("/")
        // const [id, idError] = auditChain(auditId, auditRequire)(
        //   strictAudit,
        //   element,
        // )
        // assert.strictEqual(
        //   idError,
        //   null,
        //   `Unexpected format for ID:\n${JSON.stringify(
        //     id,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(idError, null, 2)}`,
        // )
        break
      }

      case "JO": {
        // const [jo, error] = auditChain(auditJo, auditRequire)(
        //   strictAudit,
        //   element,
        // ) as [Jo, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for JO:\n${JSON.stringify(
        //     jo,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "SECTION_TA": {
        // const [sectionTa, error] = auditChain(
        //   auditJorfSectionTa,
        //   auditRequire,
        // )(strictAudit, element) as [JorfSectionTa, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for SECTION_TA:\n${JSON.stringify(
        //     sectionTa,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "TEXTE_VERSION": {
        const [texteVersion, error] = auditChain(
          auditJorfTexteVersion,
          auditRequire,
        )(strictAudit, element) as [JorfTexteVersion, unknown]
        assert.strictEqual(
          error,
          null,
          `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
            texteVersion,
            null,
            2,
          )}\nError:\n${JSON.stringify(error, null, 2)}`,
        )
        const metaCommun = texteVersion.META.META_COMMUN
        const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
        const texteId = metaCommun.ID
        const texteTitle = (
          metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE
        )
          ?.replace(/\s+/g, " ")
          .trim()
          .replace(/\s+\(\d+\)$/, "")
        texteInfosById.set(texteId, {
          endDate: metaTexteVersion.DATE_FIN,
          id: texteId,
          nature: metaCommun.NATURE,
          // state: metaTexteVersion.ETAT,
          startDate: metaTexteVersion.DATE_DEBUT,
          title: texteTitle,
        })
        const liens = metaTexteVersion.LIENS?.LIEN
        if (liens !== undefined) {
          for (const lien of liens) {
            const targetId = lien["@id"]
            if (targetId !== undefined) {
              addOrRemoveReferenceToTarget(
                changedIds,
                referencesByTargetId,
                add,
                {
                  direction: lien["@sens"],
                  endDate: metaTexteVersion.DATE_FIN,
                  id: texteId,
                  kind: "TEXTE_VERSION",
                  linkType: lien["@typelien"],
                  nature: metaCommun.NATURE,
                  // state: metaTexteVersion.ETAT,
                  startDate: metaTexteVersion.DATE_DEBUT,
                  title: texteTitle,
                  url: metaCommun.URL,
                },
                targetId,
              )
            }
          }
        }
        break
      }

      case "TEXTELR": {
        // const [textelr, error] = auditChain(auditJorfTextelr, auditRequire)(
        //   strictAudit,
        //   element,
        // ) as [JorfTextelr, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for TEXTELR:\n${JSON.stringify(
        //     textelr,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "VERSIONS": {
        // const sourceEntryPath = sourceEntry.path()
        // const sourceEntrySplitPath = sourceEntryPath.split("/")
        // assert.strictEqual(sourceEntrySplitPath[0], "global")
        // assert.strictEqual(sourceEntrySplitPath[1], "eli")
        // // const eli = sourceEntrySplitPath.slice(2, -1).join("/")
        // const [versions, versionsError] = auditChain(
        //   auditVersions,
        //   auditRequire,
        // )(strictAudit, element) as [Versions, unknown]
        // assert.strictEqual(
        //   versionsError,
        //   null,
        //   `Unexpected format for VERSIONS:\n${JSON.stringify(
        //     versions,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
        // )
        break
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceBlobEntry.path()}`,
        )
        break
      }
    }
  }
}

async function extractLegalObjectReferences(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteInfosById: Map<string, SourceArticleTexte>,
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  switch (origine) {
    case "JORF": {
      await extractJorfObjectReferences(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        sourceBlobEntry,
        add,
      )
      break
    }
    case "LEGI": {
      await extractLegiObjectReferences(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        sourceBlobEntry,
        add,
      )
      break
    }
    default:
      assertNever("Origine", origine)
  }
}

async function extractLegiObjectReferences(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteInfosById: Map<string, SourceArticleTexte>,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    LegiCategorieTag | "?xml",
    unknown,
  ][]) {
    switch (tag) {
      case "?xml": {
        break
      }

      case "ARTICLE": {
        const [article, error] = auditChain(auditLegiArticle, auditRequire)(
          strictAudit,
          element,
        ) as [LegiArticle, unknown]
        assert.strictEqual(
          error,
          null,
          `Unexpected format for ARTICLE:\n${JSON.stringify(
            article,
            null,
            2,
          )}\nError:\n${JSON.stringify(error, null, 2)}`,
        )
        const metaArticle = article.META.META_SPEC.META_ARTICLE
        const metaCommun = article.META.META_COMMUN
        const articleId = metaCommun.ID
        const liens = article.LIENS?.LIEN
        if (liens !== undefined) {
          for (const lien of liens) {
            const targetId = lien["@id"]
            if (targetId !== undefined) {
              addOrRemoveReferenceToTarget(
                changedIds,
                referencesByTargetId,
                add,
                {
                  direction: lien["@sens"],
                  endDate: metaArticle.DATE_FIN,
                  id: articleId,
                  kind: "ARTICLE",
                  linkType: lien["@typelien"],
                  number: metaArticle.NUM,
                  state: metaArticle.ETAT,
                  startDate: metaArticle.DATE_DEBUT,
                  texte:
                    article.CONTEXTE.TEXTE["@cid"] === undefined
                      ? undefined
                      : { id: article.CONTEXTE.TEXTE["@cid"] },
                  type: metaArticle.TYPE,
                  url: metaCommun.URL,
                },
                targetId,
              )
            }
          }
        }
        break
      }

      case "ID": {
        //   const sourceEntryPath = sourceEntry.path()
        //   const sourceEntrySplitPath = sourceEntryPath.split("/")
        //   assert.strictEqual(sourceEntrySplitPath[0], "global")
        //   assert.strictEqual(sourceEntrySplitPath[1], "eli")
        //   // const eli = sourceEntrySplitPath.slice(2, -1).join("/")
        //   const [id, idError] = auditChain(auditId, auditRequire)(
        //     strictAudit,
        //     element,
        //   )
        //   assert.strictEqual(
        //     idError,
        //     null,
        //     `Unexpected format for ID:\n${JSON.stringify(
        //       id,
        //       null,
        //       2,
        //     )}\nError:\n${JSON.stringify(idError, null, 2)}`,
        //   )
        break
      }

      case "SECTION_TA": {
        // const [sectionTa, error] = auditChain(
        //   auditLegiSectionTa,
        //   auditRequire,
        // )(strictAudit, element) as [LegiSectionTa, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for SECTION_TA:\n${JSON.stringify(
        //     sectionTa,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "TEXTE_VERSION": {
        const [texteVersion, error] = auditChain(
          auditLegiTexteVersion,
          auditRequire,
        )(strictAudit, element) as [LegiTexteVersion, unknown]
        assert.strictEqual(
          error,
          null,
          `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
            texteVersion,
            null,
            2,
          )}\nError:\n${JSON.stringify(error, null, 2)}`,
        )
        const metaCommun = texteVersion.META.META_COMMUN
        const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
        const texteId = metaCommun.ID
        const texteTitle = (
          metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE
        )
          ?.replace(/\s+/g, " ")
          .trim()
          .replace(/\s+\(\d+\)$/, "")
        texteInfosById.set(texteId, {
          endDate: metaTexteVersion.DATE_FIN,
          id: texteId,
          nature: metaCommun.NATURE,
          state: metaTexteVersion.ETAT,
          startDate: metaTexteVersion.DATE_DEBUT,
          title: texteTitle,
        })
        const liens = metaTexteVersion.LIENS?.LIEN
        if (liens !== undefined) {
          for (const lien of liens) {
            const targetId = lien["@id"]
            if (targetId !== undefined) {
              addOrRemoveReferenceToTarget(
                changedIds,
                referencesByTargetId,
                add,
                {
                  direction: lien["@sens"],
                  endDate: metaTexteVersion.DATE_FIN,
                  id: texteId,
                  kind: "TEXTE_VERSION",
                  linkType: lien["@typelien"],
                  nature: metaCommun.NATURE,
                  state: metaTexteVersion.ETAT,
                  startDate: metaTexteVersion.DATE_DEBUT,
                  title: texteTitle,
                  url: metaCommun.URL,
                },
                targetId,
              )
            }
          }
        }
        break
      }

      case "TEXTELR": {
        // const [textelr, error] = auditChain(auditLegiTextelr, auditRequire)(
        //   strictAudit,
        //   element,
        // ) as [LegiTextelr, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for TEXTELR:\n${JSON.stringify(
        //     textelr,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        break
      }

      case "VERSIONS": {
        //   const sourceEntryPath = sourceEntry.path()
        //   const sourceEntrySplitPath = sourceEntryPath.split("/")
        //   assert.strictEqual(sourceEntrySplitPath[0], "global")
        //   assert.strictEqual(sourceEntrySplitPath[1], "eli")
        //   const eli = sourceEntrySplitPath.slice(2, -1).join("/")
        //   const [versions, versionsError] = auditChain(
        //     auditVersions,
        //     auditRequire,
        //   )(strictAudit, element) as [Versions, unknown]
        //   assert.strictEqual(
        //     versionsError,
        //     null,
        //     `Unexpected format for VERSIONS:\n${JSON.stringify(
        //       versions,
        //       null,
        //       2,
        //     )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
        //   )
        break
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceBlobEntry.path()}`,
        )
        break
      }
    }
  }
}

async function extractSourceTreeReferencesChanges(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteInfosById: Map<string, SourceArticleTexte>,
  origine: Origine,
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
): Promise<void> {
  const sourcePreviousEntryByName =
    sourcePreviousTree === undefined
      ? undefined
      : Object.fromEntries(
          sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
        )
  for (const sourceEntry of sourceTree.entries()) {
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourcePreviousEntry !== undefined) {
      // Ensure that at the end of the loop sourcePreviousEntryByName contains
      // only entries deleted from the source tree.
      delete sourcePreviousEntryByName![sourceEntryName]
    }
    if (sourceEntry.oid() === sourcePreviousEntry?.oid()) {
      // Entry has not changed => No reference to change.
      continue
    }
    if (sourceEntry.isTree()) {
      // If sourcePreviousEntry is a blob,
      // first remove its links from the back links.
      if (sourcePreviousEntry?.isBlob()) {
        await extractLegalObjectReferences(
          changedIds,
          referencesByTargetId,
          texteInfosById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
      await extractSourceTreeReferencesChanges(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        origine,
        sourcePreviousEntry?.isTree()
          ? await sourcePreviousEntry?.getTree()
          : undefined,
        await sourceEntry.getTree(),
      )
    } else {
      // SourceEntry is a blob.
      if (sourcePreviousEntry !== undefined) {
        // Source entry has changed.
        // First, remove the links of previous entry from the back links
        // of the entries it references.
        if (sourcePreviousEntry.isTree()) {
          await removeSourceTreeReferences(
            changedIds,
            referencesByTargetId,
            texteInfosById,
            origine,
            await sourcePreviousEntry.getTree(),
          )
        } else {
          await extractLegalObjectReferences(
            changedIds,
            referencesByTargetId,
            texteInfosById,
            origine,
            sourcePreviousEntry,
            false /* remove */,
          )
        }
      }
      await extractLegalObjectReferences(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        origine,
        sourceEntry,
        true /* add */,
      )
    }
  }

  // Entries remaining in sourcePreviousEntryByName are deleted.
  if (sourcePreviousEntryByName !== undefined) {
    for (const sourcePreviousEntry of Object.values(
      sourcePreviousEntryByName,
    )) {
      // Remove the links of previous entry from the back links
      // of the entries it references.
      if (sourcePreviousEntry.isTree()) {
        await removeSourceTreeReferences(
          changedIds,
          referencesByTargetId,
          texteInfosById,
          origine,
          await sourcePreviousEntry.getTree(),
        )
      } else {
        await extractLegalObjectReferences(
          changedIds,
          referencesByTargetId,
          texteInfosById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
    }
  }
}

async function removeSourceTreeReferences(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteInfosById: Map<string, SourceArticleTexte>,
  origine: Origine,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await removeSourceTreeReferences(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        origine,
        await sourceEntry.getTree(),
      )
    } else {
      await extractLegalObjectReferences(
        changedIds,
        referencesByTargetId,
        texteInfosById,
        origine,
        sourceEntry,
        false /* remove */,
      )
    }
  }
}

sade("export_back_links_to_git <dilaDir>", true)
  .describe("Export back link of articles etc to a git repository")
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await exportBackLinksToGit(dilaDir, options))
  })
  .parse(process.argv)
