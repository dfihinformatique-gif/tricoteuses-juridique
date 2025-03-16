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
import type {
  Jo,
  JorfArticle,
  JorfArticleTm,
  JorfSectionTa,
  JorfSectionTaTm,
  JorfTexte,
  JoTm,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleTm,
  LegiSectionTa,
  LegiSectionTaTm,
  LegiTexte,
} from "$lib/legal/legi"
import type { LegalObjectReferences } from "$lib/legal/references"

import config from "$lib/server/config"
import { dilaDateRegExp, iterCommitsOids } from "$lib/server/nodegit/commits"
import {
  readOidByIdTree,
  removeOidByIdTreeEmptyNodes,
  setOidInIdTree,
  writeOidByIdTree,
  type OidByIdTree,
} from "$lib/server/nodegit/trees"
import { extractOrigineFromId } from "$lib/legal"
import { extractTypeFromId } from "$lib/legal/ids"

const { forgejo } = config

function addOrRemoveLink(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  add: boolean, // false => remove
  fromId: string,
  toId: string | undefined,
): void {
  if (toId === undefined || toId === fromId) {
    return
  }
  let references = referencesById.get(toId)
  if (add) {
    if (references === undefined) {
      references = new Set()
      referencesById.set(toId, references)
    }
    if (!references.has(fromId)) {
      references.add(fromId)
      changedIds.add(toId)
    }
  } else if (references !== undefined) {
    references.delete(fromId)
    if (references.size === 0) {
      referencesById.delete(toId)
      changedIds.add(toId)
    }
  }
}

async function exportReferencesToGit(
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

  const sourceRepository = await nodegit.Repository.open(
    path.join(dilaDir, "donnees_juridiques.git"),
  )
  const targetGitDir = path.join(dilaDir, "references_donnees_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  const referencesById: Map<string, Set<string>> = new Map()
  let skip = true
  let sourcePreviousCommit: nodegit.Commit | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  let targetOidByIdTree: OidByIdTree = { childByKey: new Map() }
  for await (const sourceCommitOid of iterCommitsOids(sourceRepository, true)) {
    const sourceCommit = await sourceRepository.getCommit(sourceCommitOid)
    const sourceMessage = sourceCommit.message()
    const dilaDate = sourceMessage.match(dilaDateRegExp)?.[0] ?? null
    if (dilaDate === null) {
      if (!silent) {
        console.warn(
          `Ignoring commit with message "${sourceMessage}" that doesn't match a Dila date.`,
        )
      }
      continue
    }

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
        while (true) {
          const { done, value } = await targetCommitsOidsIterator.next()
          if (done) {
            break
          }
          targetCommitOid = value
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
      label: "Extract IDs of references from legal objects",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const sourceTree = await sourceCommit.getTree()
    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    const changedIds: Set<string> = new Set()
    const sourcePreviousTree = await sourcePreviousCommit?.getTree()
    await extractSourceTreeReferencesChanges(
      changedIds,
      referencesById,
      sourcePreviousTree,
      sourceTree,
    )

    // Ensure that sourcePreviousCommit will be updated for next iteration.
    sourcePreviousCommit = sourceCommit

    // Read oidByIdTree if it has not been read yet.
    if (targetOidByIdTree.oid === undefined) {
      steps.push({
        label: "Read oidByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      targetOidByIdTree = await readOidByIdTree(
        targetRepository,
        targetExistingTree,
        ".json",
        targetOidByIdTree,
      )
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
      const references = referencesById.get(id)
      if (
        setOidInIdTree(
          targetOidByIdTree,
          id,
          references === undefined
            ? undefined
            : await targetRepository.createBlobFromBuffer(
                Buffer.from(
                  JSON.stringify(
                    {
                      id,
                      references: [...references].toSorted(),
                    } as LegalObjectReferences,
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
    const sourceAuthorWhen = sourceCommit.author().when()
    const sourceCommitterWhen = sourceCommit.committer().when()
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
    await targetRepository.createBranch("main", targetCommitOid!, true)
    await targetRepository.setHead("refs/heads/main")
    commitsChanged = true
  }

  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  if (commitsChanged) {
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/references_donnees_juridiques.git`
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

function extractJorfArticleTm(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  tm: JorfArticleTm | undefined,
  add: boolean, // When false => remove
): void {
  if (tm === undefined) {
    return
  }
  addOrRemoveLink(changedIds, referencesById, add, id, tm.TITRE_TM["@id"])
  extractJorfArticleTm(changedIds, referencesById, id, tm.TM, add)
}

function extractJorfObjectReferences(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  legalObject: Jo | JorfArticle | JorfSectionTa | JorfTexte,
  add: boolean, // When false => remove
): void {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      const article = legalObject as JorfArticle
      const texte = article.CONTEXTE.TEXTE
      addOrRemoveLink(changedIds, referencesById, add, id, texte["@cid"])
      const titreTxtArray = texte.TITRE_TXT
      if (titreTxtArray !== undefined) {
        for (const titreTxt of titreTxtArray) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            titreTxt["@id_txt"],
          )
        }
      }
      const tm = texte.TM
      if (tm !== undefined) {
        extractJorfArticleTm(changedIds, referencesById, id, tm, add)
      }
      for (const version of article.VERSIONS.VERSION) {
        addOrRemoveLink(
          changedIds,
          referencesById,
          add,
          id,
          version.LIEN_ART["@id"],
        )
      }
      break
    }

    case "CONT": {
      const jo = legalObject as Jo
      const structureTxt = jo.STRUCTURE_TXT
      if (structureTxt !== undefined) {
        const lienTxtArray = structureTxt.LIEN_TXT
        if (lienTxtArray !== undefined) {
          for (const lienTxt of lienTxtArray) {
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienTxt["@idtxt"],
            )
          }
        }
        const tmArray = structureTxt.TM
        if (tmArray !== undefined) {
          for (const tm of tmArray) {
            extractJoTm(changedIds, referencesById, id, tm, add)
          }
        }
      }
      break
    }

    case "SCTA": {
      const sectionTa = legalObject as JorfSectionTa
      const texte = sectionTa.CONTEXTE.TEXTE
      addOrRemoveLink(changedIds, referencesById, add, id, texte["@cid"])
      const titreTxtArray = texte.TITRE_TXT
      if (titreTxtArray !== undefined) {
        for (const titreTxt of titreTxtArray) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            titreTxt["@id_txt"],
          )
        }
      }
      const tm = texte.TM
      if (tm !== undefined) {
        extractJorfSectionTaTm(changedIds, referencesById, id, tm, add)
      }
      break
    }

    case "TEXT": {
      const texte = legalObject as JorfTexte
      const spec = texte.META.META_SPEC
      const texteChronicle = spec.META_TEXTE_CHRONICLE
      addOrRemoveLink(changedIds, referencesById, add, id, texteChronicle.CID)
      const texteVersion = spec.META_TEXTE_VERSION
      const liens = texteVersion.LIENS
      if (liens !== undefined) {
        for (const lien of liens.LIEN) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            lien["@cidtexte"],
          )
          addOrRemoveLink(changedIds, referencesById, add, id, lien["@id"])
        }
      }
      const structure = texte.STRUCT
      if (structure !== undefined) {
        const lienArticleArray = structure.LIEN_ART
        if (lienArticleArray !== undefined) {
          for (const lienArticle of lienArticleArray) {
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienArticle["@id"],
            )
          }
        }
        const lienSectionTaArray = structure.LIEN_SECTION_TA
        if (lienSectionTaArray !== undefined) {
          for (const lienSectionTa of lienSectionTaArray) {
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienSectionTa["@cid"],
            )
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienSectionTa["@id"],
            )
          }
        }
      }
      const versions = texte.VERSIONS
      if (versions !== undefined) {
        for (const version of versions.VERSION) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            version.LIEN_TXT["@id"],
          )
        }
      }
      break
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }
}

function extractJorfSectionTaTm(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  tm: JorfSectionTaTm | undefined,
  add: boolean, // When false => remove
): void {
  if (tm === undefined) {
    return
  }
  addOrRemoveLink(changedIds, referencesById, add, id, tm.TITRE_TM["@id"])
  extractJorfSectionTaTm(changedIds, referencesById, id, tm.TM, add)
}

function extractJoTm(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  tm: JoTm | undefined,
  add: boolean, // When false => remove
): void {
  if (tm === undefined) {
    return
  }
  const lienTxtArray = tm.LIEN_TXT
  if (lienTxtArray !== undefined) {
    for (const lienTxt of lienTxtArray) {
      addOrRemoveLink(changedIds, referencesById, add, id, lienTxt["@idtxt"])
    }
  }
  const tmArray = tm.TM
  if (tmArray !== undefined) {
    for (const tm of tmArray) {
      extractJoTm(changedIds, referencesById, id, tm, add)
    }
  }
}

async function extractLegalObjectReferences(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  sourceBlobEntry: nodegit.TreeEntry,
  add: boolean, // When false => remove
) {
  const id = sourceBlobEntry.name().replace(/\.json$/, "")
  const legalObject = JSON.parse(
    (await sourceBlobEntry.getBlob()).content().toString("utf-8"),
  )
  const origine = extractOrigineFromId(id)
  switch (origine) {
    case "CNIL":
    case "JORF": {
      extractJorfObjectReferences(
        changedIds,
        referencesById,
        id,
        legalObject,
        add,
      )
      break
    }

    case "DOLE": {
      // TODO
      // extractDoleObjectReferences(
      //   changedIds,
      //   referencesById,
      //   id,
      //   legalObject,
      //   add,
      // )
      break
    }

    case "KALI": {
      // TODO
      // extractKaliObjectReferences(
      //   changedIds,
      //   referencesById,
      //   id,
      //   legalObject,
      //   add,
      // )
      break
    }

    case "LEGI": {
      extractLegiObjectReferences(
        changedIds,
        referencesById,
        id,
        legalObject,
        add,
      )
      break
    }

    default:
      assertNever("Origine", origine)
  }
}

function extractLegiArticleTm(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  tm: LegiArticleTm | undefined,
  add: boolean, // When false => remove
): void {
  if (tm === undefined) {
    return
  }
  for (const titreTm of tm.TITRE_TM) {
    addOrRemoveLink(changedIds, referencesById, add, id, titreTm["@id"])
  }
  extractLegiArticleTm(changedIds, referencesById, id, tm.TM, add)
}

function extractLegiObjectReferences(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  legalObject: LegiArticle | LegiSectionTa | LegiTexte,
  add: boolean, // When false => remove
): void {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      const article = legalObject as LegiArticle
      const texte = article.CONTEXTE.TEXTE
      addOrRemoveLink(changedIds, referencesById, add, id, texte["@cid"])
      const titreTxtArray = texte.TITRE_TXT
      if (titreTxtArray !== undefined) {
        for (const titreTxt of titreTxtArray) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            titreTxt["@id_txt"],
          )
        }
      }
      const tm = texte.TM
      if (tm !== undefined) {
        extractLegiArticleTm(changedIds, referencesById, id, tm, add)
      }
      const liens = article.LIENS
      if (liens !== undefined) {
        for (const lien of liens.LIEN) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            lien["@cidtexte"],
          )
          addOrRemoveLink(changedIds, referencesById, add, id, lien["@id"])
        }
      }
      for (const version of article.VERSIONS.VERSION) {
        addOrRemoveLink(
          changedIds,
          referencesById,
          add,
          id,
          version.LIEN_ART["@id"],
        )
      }
      break
    }

    case "CONT": {
      console.warn(`Unexpected ID type ${idType} for ID ${id}`)
      break
    }

    case "SCTA": {
      const sectionTa = legalObject as LegiSectionTa
      const texte = sectionTa.CONTEXTE.TEXTE
      addOrRemoveLink(changedIds, referencesById, add, id, texte["@cid"])
      const titreTxtArray = texte.TITRE_TXT
      if (titreTxtArray !== undefined) {
        for (const titreTxt of titreTxtArray) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            titreTxt["@id_txt"],
          )
        }
      }
      const tm = texte.TM
      if (tm !== undefined) {
        extractLegiSectionTaTm(changedIds, referencesById, id, tm, add)
      }
      break
    }

    case "TEXT": {
      const texte = legalObject as LegiTexte
      const spec = texte.META.META_SPEC
      const texteChronicle = spec.META_TEXTE_CHRONICLE
      addOrRemoveLink(changedIds, referencesById, add, id, texteChronicle.CID)
      const texteVersion = spec.META_TEXTE_VERSION
      const liens = texteVersion.LIENS
      if (liens !== undefined) {
        for (const lien of liens.LIEN) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            lien["@cidtexte"],
          )
          addOrRemoveLink(changedIds, referencesById, add, id, lien["@id"])
        }
      }
      const structure = texte.STRUCT
      if (structure !== undefined) {
        const lienArticleArray = structure.LIEN_ART
        if (lienArticleArray !== undefined) {
          for (const lienArticle of lienArticleArray) {
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienArticle["@id"],
            )
          }
        }
        const lienSectionTaArray = structure.LIEN_SECTION_TA
        if (lienSectionTaArray !== undefined) {
          for (const lienSectionTa of lienSectionTaArray) {
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienSectionTa["@cid"],
            )
            addOrRemoveLink(
              changedIds,
              referencesById,
              add,
              id,
              lienSectionTa["@id"],
            )
          }
        }
      }
      const versions = texte.VERSIONS
      if (versions !== undefined) {
        for (const version of versions.VERSION) {
          addOrRemoveLink(
            changedIds,
            referencesById,
            add,
            id,
            version.LIEN_TXT["@id"],
          )
        }
      }
      break
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }
}

function extractLegiSectionTaTm(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  id: string,
  tm: LegiSectionTaTm | undefined,
  add: boolean, // When false => remove
): void {
  if (tm === undefined) {
    return
  }
  for (const titreTm of tm.TITRE_TM) {
    addOrRemoveLink(changedIds, referencesById, add, id, titreTm["@id"])
  }
  extractLegiSectionTaTm(changedIds, referencesById, id, tm.TM, add)
}

async function extractSourceTreeReferencesChanges(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
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
      // first remove its references from the back references.
      if (sourcePreviousEntry?.isBlob()) {
        await extractLegalObjectReferences(
          changedIds,
          referencesById,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
      await extractSourceTreeReferencesChanges(
        changedIds,
        referencesById,
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
          await removeSourceTreeReferences(
            changedIds,
            referencesById,
            await sourcePreviousEntry.getTree(),
          )
        } else {
          await extractLegalObjectReferences(
            changedIds,
            referencesById,
            sourcePreviousEntry,
            false /* remove */,
          )
        }
      }
      await extractLegalObjectReferences(
        changedIds,
        referencesById,
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
        await removeSourceTreeReferences(
          changedIds,
          referencesById,
          await sourcePreviousEntry.getTree(),
        )
      } else {
        await extractLegalObjectReferences(
          changedIds,
          referencesById,
          sourcePreviousEntry,
          false /* remove */,
        )
      }
    }
  }
}

async function removeSourceTreeReferences(
  changedIds: Set<string>,
  referencesById: Map<string, Set<string>>,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await removeSourceTreeReferences(
        changedIds,
        referencesById,
        await sourceEntry.getTree(),
      )
    } else {
      await extractLegalObjectReferences(
        changedIds,
        referencesById,
        sourceEntry,
        false /* remove */,
      )
    }
  }
}

sade("git_json_to_git_references_json <dilaDir>", true)
  .describe("Extract references to each legal object into a git repository")
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await exportReferencesToGit(dilaDir, options))
  })
  .parse(process.argv)
