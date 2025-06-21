import {
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
  type Auditor,
} from "@auditors/core"
import assert from "assert"

import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { auditJo } from "$lib/auditors/jorf/jo.js"
import { auditJorfArticle } from "$lib/auditors/jorf/articles.js"
import { auditJorfSectionTa } from "$lib/auditors/jorf/section_ta.js"
import { auditJorfTexteVersion } from "$lib/auditors/jorf/texte_version.js"
import { auditJorfTextelr } from "$lib/auditors/jorf/textelr.js"
import { auditLegiArticle } from "$lib/auditors/legi/articles.js"
import { auditLegiSectionTa } from "$lib/auditors/legi/section_ta.js"
import { auditLegiTexteVersion } from "$lib/auditors/legi/texte_version.js"
import { auditLegiTextelr } from "$lib/auditors/legi/textelr.js"
import { idRegExp } from "$lib/legal/ids.js"
import type {
  JorfCategorieTag,
  JorfTexte,
  JorfTextelr,
} from "$lib/legal/jorf.js"
import type {
  LegiCategorieTag,
  LegiTexte,
  LegiTextelr,
} from "$lib/legal/legi.js"
import { xmlParser } from "$lib/parsers/shared.js"
import config from "$lib/server/config.js"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  origines,
  type Origine,
} from "$lib/server/nodegit/commits.js"
import {
  getOidFromIdTree,
  readNodeBySplitPathTree,
  removeOidBySplitPathTreeEmptyNodes,
  setOidInIdTree,
  writeNodeBySplitPathTree,
  type NodeBySplitPathTree,
} from "$lib/server/nodegit/trees.js"

const { forgejo } = config

async function convertJorfEntryToJson<LegalType>(
  sourceBlobEntry: nodegit.TreeEntry,
): Promise<LegalType | undefined> {
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
        return convertLegalElementToJson(element, auditJorfArticle)
      }

      case "ID": {
        return undefined
      }

      case "JO": {
        return convertLegalElementToJson(element, auditJo)
      }

      case "SECTION_TA": {
        return convertLegalElementToJson(element, auditJorfSectionTa)
      }

      case "TEXTE_VERSION": {
        return convertLegalElementToJson(element, auditJorfTexteVersion)
      }

      case "TEXTELR": {
        return convertLegalElementToJson(element, auditJorfTextelr)
        return undefined
      }

      case "VERSIONS": {
        return undefined
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceBlobEntry.path()}`,
        )
      }
    }
  }
  return undefined
}

function convertLegalElementToJson<LegalType>(
  element: unknown,
  auditor: Auditor,
): LegalType {
  const [legalObject, error] = auditChain(auditor, auditRequire)(
    strictAudit,
    element,
  ) as [LegalType, unknown]
  assert.strictEqual(
    error,
    null,
    `Unexpected format for:\n${JSON.stringify(
      legalObject,
      null,
      2,
    )}\nError:\n${JSON.stringify(error, null, 2)}`,
  )
  return legalObject
}

async function convertLegalEntryToJson<LegalType>(
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
): Promise<LegalType | undefined> {
  switch (origine) {
    case "JORF": {
      return await convertJorfEntryToJson(sourceBlobEntry)
    }
    case "LEGI": {
      return await convertLegiEntryToJson(sourceBlobEntry)
    }
    default:
      assertNever("Origine", origine)
  }
}

async function convertLegiEntryToJson<LegalType>(
  sourceBlobEntry: nodegit.TreeEntry,
): Promise<LegalType | undefined> {
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
        return convertLegalElementToJson(element, auditLegiArticle)
      }

      case "ID": {
        return undefined
      }

      case "SECTION_TA": {
        return convertLegalElementToJson(element, auditLegiSectionTa)
      }

      case "TEXTE_VERSION": {
        return convertLegalElementToJson(element, auditLegiTexteVersion)
      }

      case "TEXTELR": {
        return convertLegalElementToJson(element, auditLegiTextelr)
      }

      case "VERSIONS": {
        return undefined
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceBlobEntry.path()}`,
        )
      }
    }
  }
  return undefined
}

async function convertSourceTreeToJson(
  origine: Origine,
  sourcePreviousRootTree: nodegit.Tree | undefined,
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceRootTree: nodegit.Tree,
  sourceTree: nodegit.Tree,
  targetNodeByIdTree: NodeBySplitPathTree,
  targetRepository: nodegit.Repository,
): Promise<boolean> {
  let changed = false
  const sourcePreviousEntryByName =
    sourcePreviousTree === undefined
      ? undefined
      : Object.fromEntries(
          sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
        )
  for (const sourceEntry of sourceTree.entries()) {
    const sourceEntryPath = sourceEntry.path()
    if (sourceEntryPath === "global/eli") {
      continue
    }
    const sourceEntryName = sourceEntry.name()
    if (sourceEntryName === "struct") {
      // Textelr are ignored here and read in the same time as the TexteVersion.
      continue
    }
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourceEntry.isTree()) {
      if (
        await convertSourceTreeToJson(
          origine,
          sourcePreviousRootTree,
          sourcePreviousEntry?.isTree()
            ? await sourcePreviousEntry?.getTree()
            : undefined,
          sourceRootTree,
          await sourceEntry.getTree(),
          targetNodeByIdTree,
          targetRepository,
        )
      ) {
        changed = true
      }
    } else {
      // SourceEntry is a blob.
      const id = sourceEntry.name().replace(/\.xml$/, "")
      if (id === "versions") {
        continue
      }
      if (id.match(idRegExp) === null) {
        console.warn(
          `Ignoring source entry "${sourceEntryPath}" with unknown ID format: ${id}`,
        )
        continue
      }

      const targetExistingOid = getOidFromIdTree(targetNodeByIdTree, id)
      if (sourceEntryPath.includes("/version/")) {
        // Source entry contains a TexteVersion
        const textelrPath = sourceEntryPath.replace("/version/", "/struct/")
        let structPreviousEntry: nodegit.TreeEntry | undefined
        try {
          structPreviousEntry =
            await sourcePreviousRootTree?.getEntry(textelrPath)
        } catch {
          structPreviousEntry = undefined
        }
        let structEntry: nodegit.TreeEntry | undefined
        try {
          structEntry = await sourceRootTree.getEntry(textelrPath)
        } catch (e) {
          console.warn(`Textelr file not found at ${textelrPath}: Error ${e}`)
          structEntry = undefined
        }
        if (structEntry?.isTree()) {
          console.warn(
            `Folder à ${textelrPath} should be a file => Ignoring Textelr`,
          )
          structEntry = undefined
        }
        if (
          sourceEntry.oid() !== sourcePreviousEntry?.oid() ||
          structEntry?.oid() !== structPreviousEntry?.oid() ||
          targetExistingOid === undefined
        ) {
          const texte = (await convertLegalEntryToJson<JorfTexte | LegiTexte>(
            origine,
            sourceEntry,
          ))!
          const textelr =
            structEntry === undefined
              ? undefined
              : await convertLegalEntryToJson<JorfTextelr | LegiTextelr>(
                  origine,
                  structEntry,
                )
          if (textelr !== undefined) {
            texte.STRUCT = textelr.STRUCT
            texte.VERSIONS = textelr.VERSIONS
          }
          const oid = await targetRepository.createBlobFromBuffer(
            Buffer.from(JSON.stringify(texte, null, 2), "utf-8"),
          )
          if (setOidInIdTree(targetNodeByIdTree, id, oid)) {
            changed = true
          }
        }
      } else if (
        sourceEntry.oid() !== sourcePreviousEntry?.oid() ||
        targetExistingOid === undefined
      ) {
        const legalObject = await convertLegalEntryToJson(origine, sourceEntry)
        const oid = await targetRepository.createBlobFromBuffer(
          Buffer.from(JSON.stringify(legalObject, null, 2), "utf-8"),
        )
        if (setOidInIdTree(targetNodeByIdTree, id, oid)) {
          changed = true
        }
      }
    }
  }
  return changed
}

async function gitXmlToGitJson(
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
      (value: string) => `Date not found in "${value}"`,
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
          path.join(dilaDir, origine.toLowerCase() + ".git"),
        ),
      ]),
    ),
  )
  const targetGitDir = path.join(dilaDir, "donnees_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<Origine, nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  let targetNodeByIdTree: NodeBySplitPathTree = { childByKey: new Map() }
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

    const sourcePreviousTreeByOrigine: Record<Origine, nodegit.Tree> =
      sourcePreviousCommitByOrigine === undefined
        ? undefined
        : Object.fromEntries(
            await Promise.all(
              Object.entries(sourcePreviousCommitByOrigine).map(
                async ([origine, sourcePreviousCommit]) => [
                  origine,
                  await sourcePreviousCommit.getTree(),
                ],
              ),
            ),
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

    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    // Read nodeByIdTree if it has not been read yet.
    if (targetNodeByIdTree.oid === undefined) {
      steps.push({
        label: "Read nodeByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      targetNodeByIdTree = await readNodeBySplitPathTree(
        targetRepository,
        targetExistingTree,
        ".json",
        targetNodeByIdTree,
      )
    }

    let commitChanged = false
    for (const [origine, sourceTree] of Object.entries(
      sourceTreeByOrigine,
    ) as Array<[Origine, nodegit.Tree]>) {
      steps.push({
        label: `Convert ${origine} to JSON`,
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      console.log(`Converting ${origine} to JSON`)
      if (
        await convertSourceTreeToJson(
          origine,
          sourcePreviousTreeByOrigine?.[origine],
          sourcePreviousTreeByOrigine?.[origine],
          sourceTree,
          sourceTree,
          targetNodeByIdTree,
          targetRepository,
        )
      ) {
        commitChanged = true
      }
    }
    if (!commitChanged) {
      // No change to commit.
      continue
    }

    // Cleanup nodeByIdTree.
    steps.push({
      label: "Cleanup nodeByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    removeOidBySplitPathTreeEmptyNodes(targetNodeByIdTree)

    // Write updated nodeByIdTree.
    steps.push({
      label: "Write updated nodeByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const targetTreeOid = await writeNodeBySplitPathTree(
      targetRepository,
      targetNodeByIdTree,
      ".json",
    )
    if (targetTreeOid.tostrS() === targetExistingTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    // Commit changes.
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
      targetTreeOid!,
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/donnees_juridiques.git`
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

sade("git_xml_to_git_json <dilaDir>", true)
  .describe(
    "Generate a git repository containing latest commits of JORF & LEGI data converted to JSON",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await gitXmlToGitJson(dilaDir, options))
  })
  .parse(process.argv)
