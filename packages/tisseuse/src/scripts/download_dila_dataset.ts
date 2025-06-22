import assert from "assert"
import fs from "fs-extra"
import gunzip from "gunzip-maybe"
import { JSDOM } from "jsdom"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"
import { Readable } from "stream"
import tar from "tar-stream"

import config from "$lib/server/config.js"
import { iterCommitsOids } from "$lib/server/nodegit/commits.js"
import { WorkingTree } from "$lib/server/nodegit/working_trees.js"

const { forgejo } = config

async function downloadDataset(
  datasetName: string,
  dilaDir: string,
  {
    push,
    silent,
    verbose,
  }: { push?: boolean; silent?: boolean; verbose?: boolean } = {},
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
  // Use main branch instead of master.
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

      // Set current tip of the main branch to this base commit.
      const branchReference = await nodegit.Reference.lookup(
        repository,
        "refs/heads/main",
      )
      await branchReference.setTarget(
        baseCommitOid,
        "Reset main branch to first commit before full archive",
      )
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

        // Set current tip of the main branch to this base commit.
        const branchReference = await nodegit.Reference.lookup(
          repository,
          "refs/heads/main",
        )
        await branchReference.setTarget(
          baseCommitOid,
          "Reset main branch to first commit before full archive",
        )

        break
      }
    }
  }
  if (!silent) {
    // Don't modify the the log below, because it is used by CI scripts
    // to detect base commit and launch incremental imports
    console.log(`Base commit ID: ${baseCommitOid}, date: ${baseDate}`)
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

    const archiveUrl = new URL(archiveName, archivesUrl).toString()
    const response = await fetch(archiveUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${archiveUrl}: ${response.status} ${response.statusText}`,
      )
    }
    if (response.body === null) {
      throw new Error("Response body is null")
    }
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

    const extract = tar.extract()
    nodeStream.pipe(gunzip()).pipe(extract)

    for await (const tarEntry of extract) {
      const { header } = tarEntry
      switch (header.type) {
        case "directory": {
          // Ignore directories.
          break
        }

        case "file":
        case "symlink": {
          const nodeSplitPath = header.name
            .split("/")
            .filter((name) => !["", "."].includes(name))
          // Sometimes, paths in tar archive begin with date. Ignore it.
          if (nodeSplitPath[0] === date) {
            nodeSplitPath.splice(0, 1)
          }
          // CAPP, CASS & INCA data may be prefixed by "juri", before "capp".
          if (
            ["capp", "cass", "inca"].includes(datasetName) &&
            nodeSplitPath[0] === "juri"
          ) {
            nodeSplitPath.splice(0, 1)
          }
          // Sometimes, paths in tar archive begin with dataset name. Ignore it.
          if (nodeSplitPath[0] === datasetName) {
            nodeSplitPath.splice(0, 1)
          }
          if (
            nodeSplitPath.length === 1 &&
            nodeSplitPath[0] ===
              `liste_suppression_${["capp", "cass", "inca"].includes(datasetName) ? "juri" : datasetName}.dat`
          ) {
            assert.strictEqual(header.type, "file")
            assert.strictEqual(
              archiveName.match(fullArchiveNameRegExp),
              null,
              `Unexpected list of files to remove in full archive: "${header.name}"`,
            )
            const chunks: Buffer[] = []
            for await (const chunk of tarEntry) {
              chunks.push(chunk)
            }
            const filesSplitPathToRemove = Buffer.concat(chunks)
              .toString("utf-8")
              .split(/\r?\n/)
              .map((filePath) => {
                const fileSplitPath = filePath
                  .trim()
                  .split("/")
                  .filter((name) => !["", "."].includes(name))
                // CAPP, CASS & INCA data may be prefixed by "juri", before "capp".
                if (
                  ["capp", "cass", "inca"].includes(datasetName) &&
                  fileSplitPath[0] === "juri"
                ) {
                  nodeSplitPath.splice(0, 1)
                }
                // Sometimes, paths in tar archive begin with date. Ignore it.
                if (fileSplitPath[0] === date) {
                  fileSplitPath.splice(0, 1)
                }
                // Sometimes, paths in tar archive begin with dataset name. Ignore it.
                if (fileSplitPath[0] === datasetName) {
                  fileSplitPath.splice(0, 1)
                }
                return fileSplitPath
              })
              .filter((fileSplitPath) => fileSplitPath.length !== 0)
              .map((fileSplitPath) => {
                if (!fileSplitPath.at(-1)!.includes(".")) {
                  fileSplitPath[fileSplitPath.length - 1] += ".xml"
                }
                return fileSplitPath
              })
            for (const fileSplitPathToRemove of filesSplitPathToRemove) {
              if (verbose) {
                console.log(
                  ">>> File to remove:",
                  fileSplitPathToRemove.join("/"),
                )
              }
              if (
                await workingTree.setItemAtSplitPath(
                  fileSplitPathToRemove,
                  undefined,
                )
              ) {
                if (verbose) {
                  console.log(
                    "<<< File removed:  ",
                    fileSplitPathToRemove.join("/"),
                  )
                }
                commitChanged = true
              }
            }
          } else {
            // Node is not a removal list.

            if (header.type === "symlink") {
              // Create blob for symlink target.
              assert(header.linkname != null, "Missing linkname in symlink")
              if (verbose) {
                console.log(
                  "symlink",
                  nodeSplitPath.join("/"),
                  "→",
                  header.linkname,
                )
              }
              const oid = await repository.createBlobFromBuffer(
                Buffer.from(header.linkname),
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

              const chunks: Buffer[] = []
              for await (const chunk of tarEntry) {
                chunks.push(chunk)
              }
              const oid = await repository.createBlobFromBuffer(
                Buffer.concat(chunks),
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

          break
        }

        default: {
          throw new TypeError(
            `Unhandled entry type "${header.type}" in tar archive`,
          )
        }
      }
      tarEntry.resume()
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
      if (!silent) {
        console.log(
          `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
        )
      }
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
      try {
        await nodegit.Branch.setUpstream(branch, `origin/${branchName}`)
      } catch (error) {
        if (!(error as Error).message.includes("cannot set upstream")) {
          throw error
        }
      }
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

sade("download_dila_dataset <dataset> <dilaDir>", true)
  .describe("Download latest versions of a Dila dataset")
  .example("dole ../dila-data/")
  .option("-p, --push", "Push dataset repository")
  .option("-s, --silent", "Hide log messages")
  .option("-v, --verbose", "Show more log messages")
  .action(async (dataset, dilaDir, options) => {
    process.exit(await downloadDataset(dataset, dilaDir, options))
  })
  .parse(process.argv)
