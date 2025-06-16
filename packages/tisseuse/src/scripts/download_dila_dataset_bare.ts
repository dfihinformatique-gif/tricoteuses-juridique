import assert from "assert"
import fs from "fs-extra"
import { JSDOM } from "jsdom"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"
import { Readable } from "stream"
import tar from "tar-stream"
import { createGunzip } from "zlib"

import config from "$lib/server/config.js"
import { iterCommitsOids } from "$lib/server/nodegit/commits.js"
import { WorkingTree } from "$lib/server/nodegit/working_trees.js"

interface TarNodeInfo {
  content: Buffer
  isDirectory: boolean
  isSymlink: boolean
  linkTarget?: string
  path: string
}

const { forgejo } = config

async function downloadDataset(
  datasetName: string,
  dilaDir: string,
  { push, silent }: { push?: boolean; silent?: boolean } = {},
): Promise<number> {
  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  const datasetNameUpper = datasetName.toUpperCase()
  const archivesUrl = `https://echanges.dila.gouv.fr/OPENDATA/${datasetNameUpper}/`
  const fullArchiveNameRegExp = new RegExp(
    `^Freemium_${datasetName}_global_(\\d{8}-\\d{6})\\.tar\\.gz$`,
  )
  const incrementalArchiveNameRegExp = new RegExp(
    `^${datasetNameUpper}_(\\d{8}-\\d{6})\\.tar\\.gz$`,
  )

  const response = await fetch(archivesUrl)
  assert(response.ok)
  const html = await response.text()
  const { document } = new JSDOM(html).window

  const archivesA = document.querySelectorAll("body pre a, body table tr td a")
  assert.notStrictEqual(archivesA.length, 0)

  const archiveNameByDate: { [date: string]: string } = {}
  let latestFullArchiveDate: string | undefined = undefined

  for (const a of archivesA) {
    const filename = a.getAttribute("href")
    if (
      filename === null ||
      filename.startsWith("?") ||
      filename.endsWith(".pdf") ||
      filename === "/OPENDATA/"
    ) {
      continue
    }

    const fullArchiveMatch = filename.match(fullArchiveNameRegExp)
    if (fullArchiveMatch !== null) {
      const date = fullArchiveMatch[1]
      archiveNameByDate[date] = filename
      if (latestFullArchiveDate === undefined || date > latestFullArchiveDate) {
        latestFullArchiveDate = date
      }
      continue
    }

    const incrementalArchiveMatch = filename.match(incrementalArchiveNameRegExp)
    if (incrementalArchiveMatch !== null) {
      archiveNameByDate[incrementalArchiveMatch[1]] = filename
      continue
    }
    console.warn(`Unexpected file in Dila repository: "${filename}"`)
  }

  assert.notStrictEqual(
    latestFullArchiveDate,
    undefined,
    `Dila's ${datasetNameUpper} repository doesn't contain a full archive.`,
  )

  // Initialize bare repository if needed.
  const gitDir = path.join(dilaDir, `${datasetName}.git`)
  const repository = (await fs.pathExists(gitDir))
    ? await nodegit.Repository.open(gitDir)
    : await nodegit.Repository.init(gitDir, 1 /* bare */)
  // Use main branc instead of master.
  await nodegit.Reference.symbolicCreate(
    repository,
    "HEAD",
    "refs/heads/main",
    1, // force overwrite
    "Set default branch to main",
  )

  // Find the commit to use as base for future commits.
  const commitOidByDate = Object.fromEntries(
    await Array.fromAsync(
      iterCommitsOids(repository, false),
      async (commitOid): Promise<[string, nodegit.Oid]> => {
        const commit = await repository.getCommit(commitOid)
        const commitMessage = commit.message().trim()
        const fullArchiveMatch = commitMessage.match(fullArchiveNameRegExp)
        if (fullArchiveMatch !== null) {
          return [fullArchiveMatch[1], commitOid]
        }
        const incrementalArchiveMatch = commitMessage.match(
          incrementalArchiveNameRegExp,
        )
        if (incrementalArchiveMatch !== null) {
          return [incrementalArchiveMatch[1], commitOid]
        }
        throw new Error(`Unexpected commit message: "${commitMessage}"`)
      },
    ),
  )
  let baseCommitOid: nodegit.Oid | undefined = undefined
  let baseDate: string | undefined = undefined
  if (commitOidByDate[latestFullArchiveDate as string] === undefined) {
    // Git repository doesn't have a commit for the latest full archive date.
    // Use the latest commit with a date just before the date of the full
    // archive as base.
    const commitsDate = Object.keys(commitOidByDate).sort((date1, date2) =>
      date2.localeCompare(date1),
    )
    baseDate = commitsDate.find(
      (date) => date < (latestFullArchiveDate as string),
    )
    if (baseDate !== undefined) {
      baseCommitOid = commitOidByDate[baseDate]
    }
  } else {
    // Latest full archive has a matching commit.
    // Use the first commit in history matching a recent archive as base.
    // Note: Some incremental archives may have no change, hence no commit,
    for (const date of Object.keys(archiveNameByDate).sort((date1, date2) =>
      date2.localeCompare(date1),
    )) {
      const commitOid = commitOidByDate[date]
      if (commitOid !== undefined) {
        baseCommitOid = commitOid
        baseDate = date
        break
      }
    }
  }

  let commitOid = baseCommitOid
  let commitsChanged = false
  for (const [date, archiveName] of Object.entries(archiveNameByDate)
    .sort(([date1], [date2]) => date1.localeCompare(date2))
    .filter(([date]) => baseDate === undefined || date > baseDate)) {
    steps.push({
      label: `Process ${archiveName}`,
      start: performance.now(),
    })
    if (!silent) {
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
    }

    let commitChanged = false
    const previousCommit =
      commitOid === undefined
        ? undefined
        : await repository.getCommit(commitOid)
    const tree = await previousCommit?.getTree()
    const workingTree = new WorkingTree(
      repository,
      tree,
      archiveName.match(fullArchiveNameRegExp) === null
        ? "incremental"
        : "full",
    )
    for await (const tarNodeInfo of streamTarGz(
      new URL(archiveName, archivesUrl).toString(),
    )) {
      if (!tarNodeInfo.isDirectory) {
        const nodeSplitPath = tarNodeInfo.path
          .split("/")
          .filter((name) => !["", "."].includes(name))
        // Sometimes, paths in tar archive begin with date. Ignore it.
        if (nodeSplitPath[0] === date) {
          nodeSplitPath.splice(0, 1)
        }
        // Sometimes, paths in tar archive begin with dataset name. Ignore it.
        if (nodeSplitPath[0] === datasetName) {
          nodeSplitPath.splice(0, 1)
        }
        if (
          nodeSplitPath.length === 1 &&
          nodeSplitPath[0] === `liste_suppression_${datasetName}.dat`
        ) {
          assert.strictEqual(
            archiveName.match(fullArchiveNameRegExp),
            null,
            `Unexpected list of files to remove in full archive: "${tarNodeInfo.path}"`,
          )
          const filesSplitPathToRemove = tarNodeInfo.content
            .toString("utf-8")
            .split(/\r?\n/)
            .map((filePath) => {
              const fileSplitPath = filePath
                .trim()
                .split("/")
                .filter((name) => !["", "."].includes(name))
              // Sometimes, paths in tar archive begin with date. Ignore it.
              if (fileSplitPath[0] === date) {
                fileSplitPath.splice(0, 1)
              }
              // Sometimes, paths in tar archive begin with dataset name. Ignore it.
              if (fileSplitPath[0] === datasetName) {
                fileSplitPath.splice(0, 1)
              }
              fileSplitPath.splice(0, 1)
              return fileSplitPath
            })
            .filter((fileSplitPath) => fileSplitPath.length !== 0)
          console.log("!!!!!!!!!!!!!!!!", filesSplitPathToRemove)
          for (const fileSplitPathToRemove of filesSplitPathToRemove) {
            if (
              await workingTree.setItemAtSplitPath(
                fileSplitPathToRemove,
                undefined,
              )
            ) {
              commitChanged = true
            }
          }
        } else {
          // Node is not a removal list.

          if (tarNodeInfo.isSymlink && tarNodeInfo.linkTarget !== undefined) {
            // Create blob for symlink target.
            const oid = await repository.createBlobFromBuffer(
              Buffer.from(tarNodeInfo.linkTarget),
            )
            if (
              await workingTree.setItemAtSplitPath(nodeSplitPath, {
                oid,
                type: "symbolic_link",
              })
            ) {
              commitChanged = true
            }
          } else {
            // Create blob for regular file.
            const oid = await repository.createBlobFromBuffer(
              tarNodeInfo.content,
            )
            if (
              await workingTree.setItemAtSplitPath(nodeSplitPath, {
                oid,
                type: "file",
              })
            ) {
              commitChanged = true
            }
          }
        }
      }
    }

    // Write pending working tree.
    const treeOid = await workingTree.write()
    if (!commitChanged) {
      // No change to commit.
      continue
    }

    // Commit changes.
    const dateObject = new Date(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}`,
    )
    const timezoneOffset = -dateObject.getTimezoneOffset() // in minutes
    const timestamp = Math.floor(dateObject.getTime() / 1000)
    const commitMessage = archiveName
    if (!silent) {
      console.log(`New commit: ${commitMessage}`)
    }
    commitOid = await repository.createCommit(
      "HEAD",
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        timestamp,
        timezoneOffset,
      ),
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        timestamp,
        timezoneOffset,
      ),
      commitMessage,
      treeOid,
      [commitOid].filter((oid) => oid !== undefined) as nodegit.Oid[],
    )
    await repository.createBranch("main", commitOid!, true)
    await repository.setHead("refs/heads/main")
    commitsChanged = true
  }

  if (commitsChanged) {
    if (forgejo !== undefined && push) {
      steps.push({
        label: "Push new commits",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      let remote: nodegit.Remote
      try {
        remote = await repository.getRemote("origin")
      } catch (error) {
        if (
          (error as Error).message.includes("remote 'origin' does not exist")
        ) {
          const remoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/${datasetName}.git`
          remote = await nodegit.Remote.create(repository, "origin", remoteUrl)
        } else {
          throw error
        }
      }
      const branch = await repository.getCurrentBranch()
      const branchName = branch.shorthand()
      const refspec = `+HEAD:refs/heads/${branchName}` // "+" => force push
      await remote.push([refspec], {
        callbacks: {
          credentials: (_url: string, username: string) => {
            return nodegit.Credential.sshKeyFromAgent(username)
          },
        },
      })
      await nodegit.Branch.setUpstream(branch, `origin/${branchName}`)
    }
  }

  // console.log("Performance: ")
  // for (const [index, step] of steps.entries()) {
  //   console.log(
  //     `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
  //   )
  // }

  return commitsChanged
    ? 0 // Some new versions of dataset have been added to git repository
    : 10 // No new version of dataset has been added to git repository.
}

async function* streamTarGz(archiveUrl: string): AsyncGenerator<TarNodeInfo> {
  const response = await fetch(archiveUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${archiveUrl}: ${response.statusText}`)
  }

  const extract = tar.extract()
  const fileQueue: TarNodeInfo[] = []
  let error: Error | undefined = undefined
  let finished = false
  let resolveYield: (() => void) | undefined
  const yieldPromise = () =>
    new Promise<void>((resolve) => {
      resolveYield = resolve
    })

  // Initial promise for the first yield
  let currentYieldPromise = yieldPromise()

  extract.on("entry", (header, stream, next) => {
    const chunks: Buffer[] = []

    // Handle directories
    if (header.type === "directory") {
      fileQueue.push({
        path: header.name,
        content: Buffer.alloc(0),
        isSymlink: false,
        isDirectory: true,
      })
      if (resolveYield) resolveYield() // Signal that a file is available
      stream.resume() // Ensure the stream is consumed for tar to proceed
      next()
      return
    }

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    stream.on("end", () => {
      const content = Buffer.concat(chunks)
      fileQueue.push({
        path: header.name,
        content,
        isSymlink: header.type === "symlink" || header.type === "link",
        isDirectory: false,
        linkTarget:
          header.linkname || header.type === "symlink"
            ? (header.linkname ?? undefined)
            : undefined,
      })
      if (resolveYield) resolveYield() // Signal that a file is available
      next()
    })

    stream.on("error", (err) => {
      error = err
      if (resolveYield) resolveYield() // Signal to unblock the generator and throw
      next(err) // Pass error to tar-stream to potentially stop extraction
    })

    stream.resume() // Ensure the stream is flowing
  })

  extract.on("finish", () => {
    finished = true
    if (resolveYield) resolveYield() // Signal that all files have been processed
  })

  extract.on("error", (err) => {
    error = err
    if (resolveYield) resolveYield() // Signal to unblock the generator and throw
  })

  // Convert fetch response to Node.js readable stream
  const gunzip = createGunzip()

  if (response.body) {
    const reader = response.body.getReader()
    const nodeStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read()
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        } catch (err) {
          this.destroy(err as Error)
        }
      },
    })

    nodeStream.pipe(gunzip).pipe(extract)
  } else {
    throw new Error("Response body is null")
  }

  // The async generator loop
  while (true) {
    if (fileQueue.length > 0) {
      yield fileQueue.shift()!
      continue // Immediately try to yield the next queued file
    }

    if (finished && fileQueue.length === 0) {
      break // All files processed and queue is empty, exit
    }

    if (error) {
      throw error // An error occurred, rethrow it
    }

    // No files in queue, not finished, no error - wait for a new file or finish/error signal
    currentYieldPromise = yieldPromise() // Create a new promise to wait on
    await currentYieldPromise // Wait until a file is added, or stream finishes/errors
  }
}

sade("download_dila_dataset <dataset> <dilaDir>", true)
  .describe("Download latest versions of a Dila dataset")
  .example("dole ../dila-data/")
  .option("-p, --push", "Push dataset repository")
  .option("-s, --silent", "Hide log messages")
  .action(async (dataset, dilaDir, options) => {
    process.exit(await downloadDataset(dataset, dilaDir, options))
  })
  .parse(process.argv)
