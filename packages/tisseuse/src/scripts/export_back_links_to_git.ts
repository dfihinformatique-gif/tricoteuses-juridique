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

import {
  auditJo,
  auditJorfArticle,
  auditJorfSectionTa,
  auditJorfTextelr,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import { auditId, auditVersions } from "$lib/auditors/legal"
import type { Versions, XmlHeader } from "$lib/legal"
import type {
  Jo,
  JorfArticle,
  JorfCategorieTag,
  JorfSectionTa,
  JorfTexte,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTexte,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { assertNever } from "$lib/asserts"
import {
  auditLegiArticle,
  auditLegiSectionTa,
  auditLegiTextelr,
  auditLegiTexteVersion,
} from "$lib/auditors/legi"

type Origine = (typeof origines)[number]

interface ReferencesToLegalObject {
  sourceIds: Set<string>
  targetId: string
}

type ReferencesByTargetId = Map<string, ReferencesToLegalObject>

type ReferencesTreeByTargetPath = Map<
  string,
  ReferencesToLegalObject | ReferencesTreeByTargetPath
>

const dilaDateRegExp = /20\d\d[01]\d[0-3]\d-([0-6]\d){3}/
const idRegExp =
  /^(DOLE|JORF|KALI|LEGI)(ARTI|SCTA|TEXT)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/
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

function addReferenceToTarget(
  referencesByTargetId: ReferencesByTargetId,
  referencesTreeByTargetPath: ReferencesTreeByTargetPath,
  targetId: string,
  sourceId: string,
  // sourceTitle: string,
) {
  let referencesToTarget = referencesByTargetId.get(targetId)
  if (referencesToTarget === undefined) {
    referencesToTarget = { sourceIds: new Set(), targetId }

    referencesByTargetId.set(targetId, referencesToTarget)

    const targetIdMatch = targetId.match(idRegExp)
    assert.notStrictEqual(targetIdMatch, null, `Unknown ID format: ${targetId}`)
    let referencesSubTreeByTargetPath = referencesTreeByTargetPath
    for (const targetIdFragment of targetIdMatch!.slice(1, -1)) {
      let referencesSubSubTree =
        referencesSubTreeByTargetPath.get(targetIdFragment)
      if (referencesSubSubTree === undefined) {
        referencesSubSubTree = new Map<string, ReferencesTreeByTargetPath>()
        referencesSubTreeByTargetPath.set(
          targetIdFragment,
          referencesSubSubTree,
        )
        referencesSubTreeByTargetPath = referencesSubSubTree
      }
    }
    const targetIdLastFragment = targetIdMatch!.at(-1)!
    const referencesToTargetFromTree =
      referencesSubTreeByTargetPath.get(targetIdLastFragment)
    assert.strictEqual(referencesToTargetFromTree, undefined)
    referencesSubTreeByTargetPath.set(targetIdLastFragment, referencesToTarget)
  }
  referencesToTarget.sourceIds.add(sourceId)
}

async function exportBackLinksToGit(
  dilaDir: string,
  {
    force,
    init,
    // push,
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

  let exitCode = 0
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
  const targetGitDir = path.join(dilaDir, "liens_inverses.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  const referencesByTargetId: ReferencesByTargetId = new Map()
  const referencesTreeByTargetPath: ReferencesTreeByTargetPath = new Map()
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<"JORF" | "LEGI", nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  for await (const {
    dilaDate,
    sourceCommitByOrigine,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryByOrigine, true)) {
    console.log(
      dilaDate,
      Object.entries(sourceCommitByOrigine).map(([origine, commit]) => [
        origine,
        commit.message(),
      ]),
    )
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
              await sourceCommit?.getTree(),
            ],
          ),
        ),
      )
    const targetPreviousCommit =
      targetPreviousCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetPreviousCommitOid)
    const targetPreviousTree = await targetPreviousCommit?.getTree()

    if (sourcePreviousCommitByOrigine === undefined) {
      for (const [origine, sourceTree] of Object.entries(
        sourceTreeByOrigine,
      ) as Array<[Origine, nodegit.Tree]>) {
        console.log(`Loading source ${origine}`)
        switch (origine) {
          case "JORF": {
            await extractJorfObjectsReferences(
              referencesByTargetId,
              referencesTreeByTargetPath,
              sourceTree,
            )
            break
          }
          case "LEGI": {
            await extractLegiObjectsReferences(
              referencesByTargetId,
              referencesTreeByTargetPath,
              sourceTree,
            )
            break
          }
          default:
            assertNever("Origine", origine)
        }
      }
    } else {
      // const sourcePreviousTreeByOrigine: Record<Origine, nodegit.Tree> =
      //   Object.fromEntries(
      //     await Promise.all(
      //       Object.entries(sourcePreviousCommitByOrigine).map(
      //         async ([origine, sourcePreviousCommit]) => [
      //           origine,
      //           await sourcePreviousCommit.getTree(),
      //         ],
      //       ),
      //     ),
      //   )
      // TODO
    }
    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    // Add refrences (reverse links).
    // steps.push({
    //   label: "Save references (back links)",
    //   start: performance.now(),
    // })
    // console.log(
    //   `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    // )
    // addReferencesToLegalObjects(
    //   legalObjectByIdByCategorieByOrigine,
    //   referencesByLegalIdByCategorieByOrigine,
    // )

    console.log("Performance: ")
    for (const [index, step] of steps.entries()) {
      console.log(
        `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
      )
    }
    return exitCode

    const targetTreeOid = (await convertGitTree(
      sourcePreviousTree,
      sourceTree,
      targetRepository,
      targetPreviousTree,
    )) as nodegit.Oid
    assert.notStrictEqual(targetTreeOid, undefined)
    if (targetTreeOid.tostrS() === targetPreviousTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    // Commit changes.
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
      [targetPreviousCommitOid].filter(
        (oid) => oid !== undefined,
      ) as nodegit.Oid[],
    )
  }
  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  return exitCode
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

async function extractJorfObjectsReferences(
  referencesByTargetId: ReferencesByTargetId,
  referencesTreeByTargetPath: ReferencesTreeByTargetPath,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await extractJorfObjectsReferences(
        referencesByTargetId,
        referencesTreeByTargetPath,
        await sourceEntry.getTree(),
      )
    } else {
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
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
            break
          }

          case "ID": {
            const sourceEntryPath = sourceEntry.path()
            const sourceEntrySplitPath = sourceEntryPath.split("/")
            assert.strictEqual(sourceEntrySplitPath[0], "global")
            assert.strictEqual(sourceEntrySplitPath[1], "eli")
            // const eli = sourceEntrySplitPath.slice(2, -1).join("/")
            const [id, idError] = auditChain(auditId, auditRequire)(
              strictAudit,
              element,
            )
            assert.strictEqual(
              idError,
              null,
              `Unexpected format for ID:\n${JSON.stringify(
                id,
                null,
                2,
              )}\nError:\n${JSON.stringify(idError, null, 2)}`,
            )
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
            break
          }

          case "SECTION_TA": {
            const [sectionTa, error] = auditChain(
              auditJorfSectionTa,
              auditRequire,
            )(strictAudit, element) as [JorfSectionTa, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for SECTION_TA:\n${JSON.stringify(
                sectionTa,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
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
            const texteId = texteVersion.META.META_COMMUN.ID
            const liens =
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
            if (liens !== undefined) {
              for (const lien of liens) {
                const targetId = lien["@id"]
                if (targetId !== undefined) {
                  addReferenceToTarget(
                    referencesByTargetId,
                    referencesTreeByTargetPath,
                    targetId,
                    texteId,
                  )
                }
              }
            }
            break
          }

          case "TEXTELR": {
            const [textelr, error] = auditChain(auditJorfTextelr, auditRequire)(
              strictAudit,
              element,
            ) as [JorfTextelr, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for TEXTELR:\n${JSON.stringify(
                textelr,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            break
          }

          case "VERSIONS": {
            const sourceEntryPath = sourceEntry.path()
            const sourceEntrySplitPath = sourceEntryPath.split("/")
            assert.strictEqual(sourceEntrySplitPath[0], "global")
            assert.strictEqual(sourceEntrySplitPath[1], "eli")
            // const eli = sourceEntrySplitPath.slice(2, -1).join("/")
            const [versions, versionsError] = auditChain(
              auditVersions,
              auditRequire,
            )(strictAudit, element) as [Versions, unknown]
            assert.strictEqual(
              versionsError,
              null,
              `Unexpected format for VERSIONS:\n${JSON.stringify(
                versions,
                null,
                2,
              )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
            )
            break
          }

          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntry.path()}`,
            )
            break
          }
        }
      }
    }
  }
}

async function extractLegiObjectsReferences(
  referencesByTargetId: ReferencesByTargetId,
  referencesTreeByTargetPath: ReferencesTreeByTargetPath,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await extractLegiObjectsReferences(
        referencesByTargetId,
        referencesTreeByTargetPath,
        await sourceEntry.getTree(),
      )
    } else {
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
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
                  addReferenceToTarget(
                    referencesByTargetId,
                    referencesTreeByTargetPath,
                    targetId,
                    articleId,
                  )
                }
              }
            }
            break
          }

          // case "ID": {
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
          //   break
          // }

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
            const liens =
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
            if (liens !== undefined) {
              for (const lien of liens) {
                const targetId = lien["@id"]
                if (targetId !== undefined) {
                  addReferenceToTarget(
                    referencesByTargetId,
                    referencesTreeByTargetPath,
                    targetId,
                    texteId,
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

          // case "VERSIONS": {
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
          //   break
          // }

          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntry.path()}`,
            )
            break
          }
        }
      }
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
