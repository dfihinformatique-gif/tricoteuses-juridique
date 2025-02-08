import {
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { assertNever } from "$lib/asserts"
import { auditJorfTexteVersion } from "$lib/auditors/jorf"
import { auditLegiArticle, auditLegiTexteVersion } from "$lib/auditors/legi"
import type { Versions, XmlHeader } from "$lib/legal"
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
import config from "$lib/server/config"

interface Source {
  id: string
  /**
   * Used only when source is an article
   */
  texteId?: string
  /**
   * Used only when source is an article
   */
  texteTitle?: string
  title?: string
}

type Origine = (typeof origines)[number]

interface ReferencesToLegalObject {
  sources: Source[]
  targetId: string
}

type ReferencesByTargetId = Map<string, ReferencesToLegalObject>

type TreeStructure = Map<string, TreeStructure | nodegit.Oid>

const { forgejo } = config
const dilaDateRegExp = /20\d\d[01]\d[0-3]\d-([0-6]\d){3}/
const idRegExp =
  /^(CNIL|DOLE|JORF|KALI|LEGI)(ARTI|CONT|SCTA|TEXT)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/
const origines = ["JORF", "LEGI"] as const
const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "ARTICLE.BLOC_TEXTUEL.CONTENU",
    "ARTICLE.NOTA.CONTENU",
    "ARTICLE.SM.CONTENU",
    "TEXTE_VERSION.ABRO.CONTENU",
    "TEXTE_VERSION.NOTA.CONTENU",
    "TEXTE_VERSION.NOTICE.CONTENU",
    "TEXTE_VERSION.RECT.CONTENU",
    "TEXTE_VERSION.SIGNATAIRES.CONTENU",
    "TEXTE_VERSION.SM.CONTENU",
    "TEXTE_VERSION.TP.CONTENU",
    "TEXTE_VERSION.VISAS.CONTENU",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

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
  const targetGitDir = path.join(
    dilaDir,
    "liens_inverses_donnees_juridiques.git",
  )
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  const referencesByTargetId: ReferencesByTargetId = new Map()
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<"JORF" | "LEGI", nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  const texteTitleById: Map<string, string> = new Map()
  const treeStructure: TreeStructure = new Map()
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
    // find the commit of target to use for a base for future
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

    const targetPreviousCommitOid = targetCommitOid
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
    const targetPreviousCommit =
      targetPreviousCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetPreviousCommitOid)
    const targetPreviousTree = await targetPreviousCommit?.getTree()

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
        texteTitleById,
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
        if (source.texteId !== undefined) {
          const sourceTexteTitle = texteTitleById.get(source.texteId)
          if (sourceTexteTitle !== undefined) {
            source.texteTitle = sourceTexteTitle
          }
        }
      }
    }

    // Read tree structure if it has not been read yet.
    if (treeStructure.size === 0) {
      steps.push({
        label: "Read tree structure",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      for (const [name, subTreeStructure] of (
        await readTreeStructure(targetRepository, targetPreviousTree)
      ).entries()) {
        treeStructure.set(name, subTreeStructure)
      }
    }

    // Update tree structure with modified references.
    steps.push({
      label: "Update tree structure with modified references",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    for (const targetId of changedIds) {
      const targetIdMatch = targetId.match(idRegExp)
      assert.notStrictEqual(
        targetIdMatch,
        null,
        `Unknown ID format: ${targetId}`,
      )
      const targetFilename = targetId + ".json"
      const references = referencesByTargetId.get(targetId)

      let currentLevel = treeStructure
      for (const targetDirName of targetIdMatch!.slice(1, -1)) {
        let subLevel = currentLevel.get(targetDirName)
        if (subLevel === undefined || subLevel instanceof nodegit.Oid) {
          subLevel = new Map()
          currentLevel.set(targetDirName, subLevel)
        }
        currentLevel = subLevel
      }

      if (references === undefined) {
        currentLevel.delete(targetFilename)
      } else {
        const targetBlobOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(
            JSON.stringify(
              {
                sources: references.sources.toSorted((source1, source2) =>
                  source1.id.localeCompare(source2.id),
                ),
              },
              null,
              2,
            ),
            "utf-8",
          ),
        )
        currentLevel.set(targetFilename, targetBlobOid)
      }
    }

    // Cleanup tree structure.
    steps.push({
      label: "Cleanup tree structure",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    removeTreeStructureEmptyNodes(treeStructure)

    // Write updated tree structure.
    steps.push({
      label: "Write updated tree structure",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const targetTreeOid = await writeTreeStructure(
      targetRepository,
      treeStructure,
    )
    if (targetTreeOid.tostrS() === targetPreviousTree?.id().tostrS()) {
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
      [targetPreviousCommitOid].filter(
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

  if (commitsChanged && forgejo !== undefined && push) {
    steps.push({
      label: "Push new commits",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    await targetRepository.createBranch("main", targetCommitOid!, true)
    await targetRepository.setHead("refs/heads/main")
    let targetRemote: nodegit.Remote
    try {
      targetRemote = await targetRepository.getRemote("origin")
    } catch (error) {
      if ((error as Error).message.includes("remote 'origin' does not exist")) {
        const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/liens_inverses_donnees_juridiques.git`
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
    await nodegit.Branch.setUpstream(targetBranch, `origin/${targetBranchName}`)
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
  texteTitleById: Map<string, string>,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    JorfCategorieTag | "?xml",
    (
      | Jo
      | JorfArticle
      | JorfSectionTa
      | JorfTextelr
      | JorfTexteVersion
      | Versions
      | XmlHeader
    ),
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
        const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
        const texteId = texteVersion.META.META_COMMUN.ID
        const texteTitle = metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE
        if (texteTitle !== undefined) {
          texteTitleById.set(texteId, texteTitle)
        }
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
                  id: texteId,
                  title: metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE,
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
  texteTitleById: Map<string, string>,
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  switch (origine) {
    case "JORF": {
      await extractJorfObjectReferences(
        changedIds,
        referencesByTargetId,
        texteTitleById,
        sourceBlobEntry,
        add,
      )
      break
    }
    case "LEGI": {
      await extractLegiObjectReferences(
        changedIds,
        referencesByTargetId,
        texteTitleById,
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
  texteTitleById: Map<string, string>,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    LegiCategorieTag | "?xml",
    (
      | LegiArticle
      | LegiSectionTa
      | LegiTextelr
      | LegiTexteVersion
      | Versions
      | XmlHeader
    ),
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
        const articleId = article.META.META_COMMUN.ID
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
                  id: articleId,
                  texteId: article.CONTEXTE.TEXTE["@cid"],
                  title: article.META.META_SPEC.META_ARTICLE.NUM,
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
        const texteId = texteVersion.META.META_COMMUN.ID
        const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
        const texteTitle = metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE
        if (texteTitle !== undefined) {
          texteTitleById.set(texteId, texteTitle)
        }
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
                  id: texteId,
                  title: texteTitle,
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
  texteTitleById: Map<string, string>,
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
          texteTitleById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
      await extractSourceTreeReferencesChanges(
        changedIds,
        referencesByTargetId,
        texteTitleById,
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
            texteTitleById,
            origine,
            await sourcePreviousEntry.getTree(),
          )
        } else {
          await extractLegalObjectReferences(
            changedIds,
            referencesByTargetId,
            texteTitleById,
            origine,
            sourcePreviousEntry,
            false /* remove */,
          )
        }
      }
      await extractLegalObjectReferences(
        changedIds,
        referencesByTargetId,
        texteTitleById,
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
          texteTitleById,
          origine,
          await sourcePreviousEntry.getTree(),
        )
      } else {
        await extractLegalObjectReferences(
          changedIds,
          referencesByTargetId,
          texteTitleById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
    }
  }
}

async function* iterCommitsOids(
  repository: nodegit.Repository,
  reverse: boolean,
): AsyncGenerator<nodegit.Oid, void> {
  const revisionWalker = repository.createRevWalk()
  revisionWalker.pushHead()
  if (reverse) {
    revisionWalker.sorting(nodegit.Revwalk.SORT.REVERSE)
  }
  while (true) {
    try {
      const commitOid = await revisionWalker.next()
      yield commitOid
    } catch (err) {
      if (
        (err as Error)?.message.includes("Method next has thrown an error.")
      ) {
        break
      }
      throw err
    }
  }
}

async function* iterSourceCommitsWithSameDilaDate(
  repositoryByOrigine: Record<Origine, nodegit.Repository>,
  reverse: boolean,
): AsyncGenerator<
  { dilaDate: string; sourceCommitByOrigine: Record<Origine, nodegit.Commit> },
  void
> {
  // When reverse is false, the first commit is the most recent one.
  // When reverse is true, the first commit is the latest one.
  const commitsOidsIteratorByOrigine = Object.fromEntries(
    Object.entries(repositoryByOrigine).map(([origine, repository]) => [
      origine,
      iterCommitsOids(repository, reverse),
    ]),
  )
  iterCommitsWithSameDilaDate: while (true) {
    const commitOrNullByOrigine: Record<string, nodegit.Commit | null> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(commitsOidsIteratorByOrigine).map(
            async ([origine, commitsOidsIterator]) => {
              const { done, value } = await commitsOidsIterator.next()
              if (done) {
                return [origine, null]
              }
              return [
                origine,
                await repositoryByOrigine[origine as Origine].getCommit(
                  value as nodegit.Oid,
                ),
              ]
            },
          ),
        ),
      )
    if (
      Object.values(commitOrNullByOrigine).some((commit) => commit === null)
    ) {
      return
    }
    const commitByOrigine = commitOrNullByOrigine as Record<
      Origine,
      nodegit.Commit
    >
    const commitDilaDateByOrigine = Object.fromEntries(
      Object.entries(commitByOrigine).map(([origine, commit]) => {
        const message = commit.message()
        const dilaDate = message.match(dilaDateRegExp)?.[0] ?? null
        return [origine, dilaDate]
      }),
    )
    let dilaDateGoal = Object.values(commitDilaDateByOrigine).reduce(
      (dilaDateGoal, commitDilaDate) =>
        commitDilaDate === null
          ? dilaDateGoal
          : dilaDateGoal === null
            ? commitDilaDate
            : reverse
              ? commitDilaDate > dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal
              : commitDilaDate < dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal,
      null,
    )
    if (dilaDateGoal === null) {
      continue iterCommitsWithSameDilaDate
    }

    // Iterate commits until each origin has the same commit date as the others.
    tryNextDilaDate: while (true) {
      for (const origineAndCommitTuple of Object.entries(commitByOrigine)) {
        const origine = origineAndCommitTuple[0]
        let commit = origineAndCommitTuple[1]
        let commitDilaDate = commitDilaDateByOrigine[origine]
        while (
          commitDilaDate === null ||
          (reverse
            ? commitDilaDate < dilaDateGoal
            : commitDilaDate > dilaDateGoal)
        ) {
          const { done, value } =
            await commitsOidsIteratorByOrigine[origine].next()
          if (done) {
            return
          }
          commitByOrigine[origine as Origine] = commit =
            await repositoryByOrigine[origine as Origine].getCommit(
              value as nodegit.Oid,
            )
          const message = commit.message()
          commitDilaDateByOrigine[origine] = commitDilaDate =
            message.match(dilaDateRegExp)?.[0] ?? null
        }
        if (commitDilaDate !== dilaDateGoal) {
          dilaDateGoal = commitDilaDate
          // Check if each origin has a commit with the new dilaDateGoal.
          continue tryNextDilaDate
        }
      }
      // The commits of each origin have the same Dila date.
      yield {
        dilaDate: dilaDateGoal,
        sourceCommitByOrigine: { ...commitByOrigine },
      }
      // Go to the next commit of each origin and look again for a Dila date
      // that is present in the commits of each origin.
      continue iterCommitsWithSameDilaDate
    }
  }
}

async function readTreeStructure(
  repository: nodegit.Repository,
  tree: nodegit.Tree | undefined,
): Promise<TreeStructure> {
  const structure: TreeStructure = new Map()
  if (tree !== undefined) {
    const entries = tree.entries()

    for (const entry of entries) {
      if (entry.isTree()) {
        const subtree = await nodegit.Tree.lookup(repository, entry.oid())
        structure.set(
          entry.name(),
          await readTreeStructure(repository, subtree),
        )
      } else {
        structure.set(entry.name(), entry.id())
      }
    }
  }
  return structure
}

async function removeSourceTreeReferences(
  changedIds: Set<string>,
  referencesByTargetId: ReferencesByTargetId,
  texteTitleById: Map<string, string>,
  origine: Origine,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await removeSourceTreeReferences(
        changedIds,
        referencesByTargetId,
        texteTitleById,
        origine,
        await sourceEntry.getTree(),
      )
    } else {
      await extractLegalObjectReferences(
        changedIds,
        referencesByTargetId,
        texteTitleById,
        origine,
        sourceEntry,
        false /* remove */,
      )
    }
  }
}

function removeTreeStructureEmptyNodes(structure: TreeStructure): void {
  for (const [name, entry] of structure.entries()) {
    if (!(entry instanceof nodegit.Oid)) {
      removeTreeStructureEmptyNodes(entry)
      if (entry.size === 0) {
        structure.delete(name)
      }
    }
  }
}

async function writeTreeStructure(
  repository: nodegit.Repository,
  structure: TreeStructure,
): Promise<nodegit.Oid> {
  const builder = await nodegit.Treebuilder.create(repository)

  for (const [name, entry] of structure.entries()) {
    if (entry instanceof nodegit.Oid) {
      builder.insert(name, entry, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000
    } else {
      const subtreeOid = await writeTreeStructure(repository, entry)
      builder.insert(name, subtreeOid, nodegit.TreeEntry.FILEMODE.TREE) // 0o100644
    }
  }

  return builder.write()
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
