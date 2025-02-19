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
import {
  auditJo,
  auditJorfArticle,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import { auditLegiArticle, auditLegiTexteVersion } from "$lib/auditors/legi"
import type {
  Jo,
  JorfArticle,
  JorfCategorieTag,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiCategorieTag,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { xmlParser } from "$lib/parsers/shared"
import {
  type EdgesById,
  type EdgeWithoutNode,
  type LegalObjectRelations,
  type RelationNodeById,
} from "$lib/relations"
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

function addOrRemoveRelation(
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
  add: boolean, // false => remove
  fromId: string,
  edgeWithoutNode: EdgeWithoutNode,
  toId: string,
): boolean {
  let changed = false
  for (const { edgesById, sourceId, targetId } of [
    { edgesById: outgoingEdgesById, sourceId: fromId, targetId: toId },
    { edgesById: incomingEdgesById, sourceId: toId, targetId: fromId },
  ]) {
    let edges = edgesById.get(sourceId)
    if (add) {
      if (edges === undefined) {
        edges = []
        edgesById.set(sourceId, edges)
      }
      if (edges.every(({ node }) => node.id !== targetId)) {
        edges.push({ ...edgeWithoutNode, node: { id: targetId } })
        changed = true
      }
    } else if (edges !== undefined) {
      // Remove edge from node.
      const index = edges.findIndex(({ node }) => node.id === targetId)
      if (index !== -1) {
        edges.splice(index, 1)
        if (edges.length === 0) {
          edgesById.delete(sourceId)
          changed = true
        }
      }
    }
  }
  return changed
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
  const targetGitDir = path.join(dilaDir, "relations_donnees_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  const incomingEdgesById: EdgesById = new Map()
  const nodeById: RelationNodeById = new Map()
  const outgoingEdgesById: EdgesById = new Map()
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<Origine, nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  const targetOidByIdTree: OidByIdTree = new Map()
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
      label: "Extract relations from legal objects",
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
      await extractSourceTreeRelationsChanges(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
        origine,
        sourcePreviousTree,
        sourceTree,
      )
    }

    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    // Add titles of texts to sources, when source is an article.
    steps.push({
      label: "Add texts recaps to recaps of articles & sections TA",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    for (const node of nodeById.values()) {
      if (node.kind === "ARTICLE" && node.texte !== undefined) {
        const texteRecap = nodeById.get(node.texte.id)
        if (texteRecap !== undefined) {
          node.texte = texteRecap
        }
      } else if (node.kind === "SECTION_TA" && node.texte !== undefined) {
        const texteRecap = nodeById.get(node.texte.id)
        if (texteRecap !== undefined) {
          node.texte = texteRecap
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

    // Update oidByIdTree with modified relations.
    steps.push({
      label: "Update oidByIdTree with modified relations",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    let commitChanged = false
    for (const id of changedIds) {
      const incoming = incomingEdgesById.get(id)
      const outgoing = outgoingEdgesById.get(id)
      if (
        setOidInIdTree(
          targetOidByIdTree,
          id,
          incoming === undefined && outgoing === undefined
            ? undefined
            : await targetRepository.createBlobFromBuffer(
                Buffer.from(
                  JSON.stringify(
                    {
                      id,
                      incoming: incoming
                        ?.toSorted((edge1, edge2) =>
                          edge1.node.id.localeCompare(edge2.node.id),
                        )
                        .map((edge) => {
                          const node = nodeById.get(edge.node.id)
                          return node === undefined ? edge : { ...edge, node }
                        }),
                      outgoing: outgoing
                        ?.toSorted((edge1, edge2) =>
                          edge1.node.id.localeCompare(edge2.node.id),
                        )
                        .map((edge) => {
                          const node = nodeById.get(edge.node.id)
                          return node === undefined ? edge : { ...edge, node }
                        }),
                    } as LegalObjectRelations,
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/relations_donnees_juridiques.git`
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

async function extractJorfObjectRelations(
  changedIds: Set<string>,
  nodeById: RelationNodeById,
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
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
        const [article, error] = auditChain(auditJorfArticle, auditRequire)(
          strictAudit,
          element,
        ) as [JorfArticle, unknown]
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
        nodeById.set(articleId, {
          endDate: metaArticle.DATE_FIN,
          id: articleId,
          kind: "ARTICLE",
          number: metaArticle.NUM,
          // state: metaArticle.ETAT,
          startDate: metaArticle.DATE_DEBUT,
          texte:
            article.CONTEXTE.TEXTE["@cid"] === undefined
              ? undefined
              : { id: article.CONTEXTE.TEXTE["@cid"] },
          type: metaArticle.TYPE,
        })
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
        const [jo, error] = auditChain(auditJo, auditRequire)(
          strictAudit,
          element,
        ) as [Jo, unknown]
        assert.strictEqual(
          error,
          null,
          `Unexpected format for JO:\n${JSON.stringify(
            jo,
            null,
            2,
          )}\nError:\n${JSON.stringify(error, null, 2)}`,
        )
        const metaConteneur = jo.META.META_SPEC.META_CONTENEUR
        const metaCommun = jo.META.META_COMMUN
        const joId = metaCommun.ID
        nodeById.set(joId, {
          date: metaConteneur.DATE_PUBLI,
          id: joId,
          kind: "JO",
          number: metaConteneur.NUM,
          title: metaConteneur.TITRE,
        })
        break
      }

      case "SECTION_TA": {
        // const [sectionTa, error] = auditChain(auditJorfSectionTa, auditRequire)(
        //   strictAudit,
        //   element,
        // ) as [JorfSectionTa, unknown]
        // assert.strictEqual(
        //   error,
        //   null,
        //   `Unexpected format for SECTION_TA:\n${JSON.stringify(
        //     sectionTa,
        //     null,
        //     2,
        //   )}\nError:\n${JSON.stringify(error, null, 2)}`,
        // )
        // const sectionTaId = sectionTa.ID
        // nodeById.set(sectionTaId, {
        //   // startDate: metaConteneur.DATE_PUBLI,
        //   // id: sectionTaId,
        //   // kind: "SECTION_TA",
        //   // number: metaConteneur.NUM,
        //   // title: metaConteneur.TITRE,
        // })
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
        nodeById.set(texteId, {
          endDate: metaTexteVersion.DATE_FIN,
          id: texteId,
          kind: "TEXTE",
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
              if (
                addOrRemoveRelation(
                  incomingEdgesById,
                  outgoingEdgesById,
                  add,
                  texteId,
                  {
                    direction: lien["@sens"],
                    linkType: lien["@typelien"],
                  },
                  targetId,
                )
              ) {
                changedIds.add(targetId)
              }
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

async function extractLegalObjectRelations(
  changedIds: Set<string>,
  nodeById: RelationNodeById,
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  switch (origine) {
    case "JORF": {
      await extractJorfObjectRelations(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
        sourceBlobEntry,
        add,
      )
      break
    }
    case "LEGI": {
      await extractLegiObjectRelations(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
        sourceBlobEntry,
        add,
      )
      break
    }
    default:
      assertNever("Origine", origine)
  }
}

async function extractLegiObjectRelations(
  changedIds: Set<string>,
  nodeById: RelationNodeById,
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
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
        nodeById.set(articleId, {
          endDate: metaArticle.DATE_FIN,
          id: articleId,
          kind: "ARTICLE",
          number: metaArticle.NUM,
          state: metaArticle.ETAT,
          startDate: metaArticle.DATE_DEBUT,
          texte:
            article.CONTEXTE.TEXTE["@cid"] === undefined
              ? undefined
              : { id: article.CONTEXTE.TEXTE["@cid"] },
          type: metaArticle.TYPE,
        })
        const liens = article.LIENS?.LIEN
        if (liens !== undefined) {
          for (const lien of liens) {
            const targetId = lien["@id"]
            if (targetId !== undefined) {
              if (
                addOrRemoveRelation(
                  incomingEdgesById,
                  outgoingEdgesById,
                  add,
                  articleId,
                  {
                    direction: lien["@sens"],
                    linkType: lien["@typelien"],
                  },
                  targetId,
                )
              ) {
                changedIds.add(targetId)
              }
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
        nodeById.set(texteId, {
          endDate: metaTexteVersion.DATE_FIN,
          id: texteId,
          kind: "TEXTE",
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
              if (
                addOrRemoveRelation(
                  incomingEdgesById,
                  outgoingEdgesById,
                  add,
                  texteId,
                  {
                    direction: lien["@sens"],
                    linkType: lien["@typelien"],
                  },
                  targetId,
                )
              ) {
                changedIds.add(targetId)
              }
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

async function extractSourceTreeRelationsChanges(
  changedIds: Set<string>,
  nodeById: RelationNodeById,
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
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
    if (sourceEntry.path() === "global/eli") {
      continue
    }
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourcePreviousEntry !== undefined) {
      // Ensure that at the end of the loop sourcePreviousEntryByName contains
      // only entries deleted from the source tree.
      delete sourcePreviousEntryByName![sourceEntryName]
    }
    if (sourceEntry.oid() === sourcePreviousEntry?.oid()) {
      // Entry has not changed => No relation to change.
      continue
    }
    if (sourceEntry.isTree()) {
      // If sourcePreviousEntry is a blob,
      // first remove its links from the back links.
      if (sourcePreviousEntry?.isBlob()) {
        await extractLegalObjectRelations(
          changedIds,
          nodeById,
          incomingEdgesById,
          outgoingEdgesById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
      await extractSourceTreeRelationsChanges(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
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
        // First, remove the relations of previous entry from the legal objects
        // that it references.
        if (sourcePreviousEntry.isTree()) {
          await removeSourceTreeRelations(
            changedIds,
            nodeById,
            incomingEdgesById,
            outgoingEdgesById,
            origine,
            await sourcePreviousEntry.getTree(),
          )
        } else {
          await extractLegalObjectRelations(
            changedIds,
            nodeById,
            incomingEdgesById,
            outgoingEdgesById,
            origine,
            sourcePreviousEntry,
            false /* remove */,
          )
        }
      }
      await extractLegalObjectRelations(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
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
      // Remove the relations of previous entry from the legal objects
      // that it references
      if (sourcePreviousEntry.isTree()) {
        await removeSourceTreeRelations(
          changedIds,
          nodeById,
          incomingEdgesById,
          outgoingEdgesById,
          origine,
          await sourcePreviousEntry.getTree(),
        )
      } else {
        await extractLegalObjectRelations(
          changedIds,
          nodeById,
          incomingEdgesById,
          outgoingEdgesById,
          origine,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
    }
  }
}

// function* iterChain<Type>(
//   iterable1: Iterable<Type> | undefined,
//   iterable2: Iterable<Type> | undefined,
// ): Generator<Type, void> {
//   if (iterable1 !== undefined) {
//     yield* iterable1
//   }
//   if (iterable2 !== undefined) {
//     yield* iterable2
//   }
// }

async function removeSourceTreeRelations(
  changedIds: Set<string>,
  nodeById: RelationNodeById,
  incomingEdgesById: EdgesById,
  outgoingEdgesById: EdgesById,
  origine: Origine,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await removeSourceTreeRelations(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
        origine,
        await sourceEntry.getTree(),
      )
    } else {
      await extractLegalObjectRelations(
        changedIds,
        nodeById,
        incomingEdgesById,
        outgoingEdgesById,
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
