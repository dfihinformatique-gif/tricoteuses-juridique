import assert from "assert"
import fs from "fs-extra"
import { JSDOM } from "jsdom"
import path from "path"
import sade from "sade"
import { $, cd } from "zx"

import { walkDir } from "$lib/server/file_systems"

async function downloadDataset(
  datasetName: string,
  dilaDir: string,
  { push, silent }: { push?: boolean; silent?: boolean } = {},
): Promise<number> {
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
  let newDatasetVersionsCount = 0
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
    console.warn(`Unexpected file in Dila repository: ${filename}`)
  }
  assert.notStrictEqual(
    latestFullArchiveDate,
    undefined,
    `Dila's ${datasetNameUpper} repository doesn't contain a full archive.`,
  )

  cd(dilaDir)
  let latestArchiveName: string | undefined = undefined
  if (await fs.pathExists(datasetName)) {
    cd(datasetName)
    try {
      latestArchiveName = (await $`git log -1 --pretty=%B`).stdout.trim()
    } catch (processOutput) {
      // Git repository has no commit yet.
    }
    cd("..")
  }
  const latestArchiveDate = latestArchiveName?.match(/(\d{8}-\d{6})/)?.[1]
  for (const [date, archiveName] of Object.entries(archiveNameByDate).sort(
    ([date1], [date2]) => date1.localeCompare(date2),
  )) {
    if (latestArchiveDate != null && date <= latestArchiveDate) {
      continue
    }
    if (!silent) {
      console.log(`Adding ${archiveName} to dataset…`)
    }
    const archiveUrl = new URL(archiveName, archivesUrl).toString()
    await $`curl --remote-name --show-error --silent ${archiveUrl}`
    if (archiveName.match(fullArchiveNameRegExp) === null) {
      // Incremental archive
      await $`tar xzf ${archiveName}`
      // Most of the times an incremental archive is untared in ${date} directory,
      // but sometimes it is directly untared in ${datasetName} directory.
      if (await fs.pathExists(date)) {
        const archiveNodeNames = await fs.readdir(date)
        assert(
          archiveNodeNames.length <= 2,
          `Unexpected files or directories in archive: ${archiveNodeNames.join(
            ", ",
          )}`,
        )

        // When archive contains a symbolic link and dataset contains at the same path
        // something that is not a symbolic link, remove it before copy, otherwise
        // copy of symbolic link will fail.
        const archiveDatasetDir = path.join(date, datasetName)
        for (const relativeSplitPath of walkDir(archiveDatasetDir)) {
          const archiveFilePath = path.join(
            archiveDatasetDir,
            ...relativeSplitPath,
          )
          if (fs.lstatSync(archiveFilePath).isSymbolicLink()) {
            const datasetFilePath = path.join(datasetName, ...relativeSplitPath)
            if (
              fs.pathExistsSync(datasetFilePath) &&
              !fs.lstatSync(datasetFilePath).isSymbolicLink()
            ) {
              fs.removeSync(datasetFilePath)
            }
          }
        }

        await $`cp -r ${archiveDatasetDir}/* ${datasetName}/`
        const removalListFilePath = path.join(
          date,
          `liste_suppression_${datasetName}.dat`,
        )
        if (await fs.pathExists(removalListFilePath)) {
          const filesPathToRemove = (
            await fs.readFile(removalListFilePath, "utf-8")
          )
            .split(/\r?\n/)
            .map((filePath) => filePath.trim())
            .filter((filePath) => filePath !== "")
          for (const filePathToRemove of filesPathToRemove) {
            await $`rm -f ${filePathToRemove}.xml`
          }
        }
        await $`rm -R ${date}`
      } else {
        const removalListFilePath = `liste_suppression_${datasetName}.dat`
        if (await fs.pathExists(removalListFilePath)) {
          const filesPathToRemove = (
            await fs.readFile(removalListFilePath, "utf-8")
          )
            .split(/\r?\n/)
            .map((filePath) => filePath.trim())
            .filter((filePath) => filePath !== "")
          for (const filePathToRemove of filesPathToRemove) {
            await $`rm -f ${filePathToRemove}.xml`
          }
          await $`rm ${removalListFilePath}`
        }
      }
    } else {
      // Full archive.
      // Note: Remove every files except .git repository.
      await $`rm -Rf ${datasetName}/*`
      await $`tar xzf ${archiveName}`
    }
    cd(datasetName)
    await $`git add .`
    if ((await $`git diff --quiet --staged`.exitCode) !== 0) {
      newDatasetVersionsCount++
      await $`git commit -m ${archiveName} --quiet`
      if (push) {
        await $`git push`
      }
    }
    cd("..")
    await $`rm ${archiveName}`
  }
  return newDatasetVersionsCount === 0
    ? 10 // No new version of dataset has been added to git repository.
    : 0
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
