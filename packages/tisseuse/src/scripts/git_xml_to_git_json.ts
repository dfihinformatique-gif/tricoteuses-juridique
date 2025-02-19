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

import { assertNever } from "$lib/asserts"
import {
  auditJo,
  auditJorfArticle,
  auditJorfSectionTa,
  auditJorfTextelr,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import {
  auditLegiArticle,
  auditLegiSectionTa,
  auditLegiTextelr,
  auditLegiTexteVersion,
} from "$lib/auditors/legi"
import { idRegExp } from "$lib/legal/ids"
import type { JorfCategorieTag } from "$lib/legal/jorf"
import type { LegiCategorieTag } from "$lib/legal/legi"
import { xmlParser } from "$lib/parsers/shared"
import config from "$lib/server/config"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  originesEtendues,
  type Origine,
} from "$lib/server/nodegit/commits"
import {
  getOidFromIdTree,
  readOidByIdTree,
  removeOidByIdTreeEmptyNodes,
  setOidInIdTree,
  writeOidByIdTree,
  type OidByIdTree,
} from "$lib/server/nodegit/trees"

const { forgejo } = config

async function auditAndConvertLegalObjectToJson(
  element: unknown,
  auditor: Auditor,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid> {
  const [article, error] = auditChain(auditor, auditRequire)(
    strictAudit,
    element,
  )
  assert.strictEqual(
    error,
    null,
    `Unexpected format for:\n${JSON.stringify(
      article,
      null,
      2,
    )}\nError:\n${JSON.stringify(error, null, 2)}`,
  )
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(JSON.stringify(article, null, 2), "utf-8"),
  )
}

async function convertJorfObjectToJson(
  sourceBlobEntry: nodegit.TreeEntry,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
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
        return await auditAndConvertLegalObjectToJson(
          element,
          auditJorfArticle,
          targetRepository,
        )
      }

      case "ID": {
        return undefined
      }

      case "JO": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditJo,
          targetRepository,
        )
      }

      case "SECTION_TA": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditJorfSectionTa,
          targetRepository,
        )
      }

      case "TEXTE_VERSION": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditJorfTexteVersion,
          targetRepository,
        )
      }

      case "TEXTELR": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditJorfTextelr,
          targetRepository,
        )
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

async function convertLegalObjectToJson(
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  switch (origine) {
    case "JORF": {
      return await convertJorfObjectToJson(sourceBlobEntry, targetRepository)
    }
    case "LEGI": {
      return await convertLegiObjectToJson(sourceBlobEntry, targetRepository)
    }
    default:
      assertNever("Origine", origine)
  }
}

async function convertLegiObjectToJson(
  sourceBlobEntry: nodegit.TreeEntry,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
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
        return await auditAndConvertLegalObjectToJson(
          element,
          auditLegiArticle,
          targetRepository,
        )
      }

      case "ID": {
        return undefined
      }

      case "SECTION_TA": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditLegiSectionTa,
          targetRepository,
        )
      }

      case "TEXTE_VERSION": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditLegiTexteVersion,
          targetRepository,
        )
      }

      case "TEXTELR": {
        return await auditAndConvertLegalObjectToJson(
          element,
          auditLegiTextelr,
          targetRepository,
        )
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
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  targetOidByIdTree: OidByIdTree,
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
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourceEntry.isTree()) {
      if (
        await convertSourceTreeToJson(
          origine,
          sourcePreviousEntry?.isTree()
            ? await sourcePreviousEntry?.getTree()
            : undefined,
          await sourceEntry.getTree(),
          targetOidByIdTree,
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
          `Ignoring source entry "${sourceEntry.path()}" with unknown ID format: ${id}`,
        )
        continue
      }
      const targetExistingOid = getOidFromIdTree(targetOidByIdTree, id)
      if (
        sourceEntry.oid() !== sourcePreviousEntry?.oid() ||
        targetExistingOid === undefined
      ) {
        if (
          setOidInIdTree(
            targetOidByIdTree,
            id,
            await convertLegalObjectToJson(
              origine,
              sourceEntry,
              targetRepository,
            ),
          )
        ) {
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
      originesEtendues.map(async (origine) => [
        origine,
        await nodegit.Repository.open(
          path.join(dilaDir, origine.toLowerCase(), ".git"),
        ),
      ]),
    ),
  )
  const targetGitDir = path.join(dilaDir, "textes_juridiques_json.git")
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
          sourceTree,
          targetOidByIdTree,
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
      ".md",
    )
    if (targetTreeOid.tostrS() === targetExistingTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    if (commitChanged) {
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
      commitsChanged = true
    }
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/textes_juridiques_json.git`
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
