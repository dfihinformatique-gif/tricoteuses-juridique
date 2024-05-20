import assert from "assert"
import fs from "fs-extra"
import { JSDOM } from "jsdom"
import path from "path"
import sade from "sade"
import { $, cd } from "zx"

import { parseDossierLegislatif } from "$lib/parsers"
import { walkDir } from "$lib/server/file_systems"

async function downloadDoleHtml(
  dilaDir: string,
  {
    push,
    resume,
    silent,
    verbose,
  }: {
    push?: boolean
    resume?: string
    silent?: boolean
    verbose?: boolean
  } = {},
): Promise<number> {
  let changed = false
  let skip = resume !== undefined

  const dataDir = path.join(dilaDir, "dole")
  assert(await fs.pathExists(dataDir))

  const echeanciersHtmlDirName = "dole_echeanciers_html"
  const echeanciersHtmlDir = path.join(dilaDir, echeanciersHtmlDirName)
  assert(await fs.pathExists(echeanciersHtmlDir))

  cd(echeanciersHtmlDir)
  let latestCommitName: string | undefined = undefined
  try {
    latestCommitName = (await $`git log -1 --pretty=%B`).stdout.trim()
  } catch (processOutput) {
    // Git repository has no commit yet.
  }
  cd("..")

  iterXmlFiles: for (const relativeSplitPath of walkDir(dataDir)) {
    const relativePath = path.join(...relativeSplitPath)
    if (skip) {
      if (relativePath.startsWith(resume as string)) {
        skip = false
        console.log(`Resuming at file ${relativePath}...`)
      } else {
        continue
      }
    }

    const filePath = path.join(dataDir, relativePath)
    if (!filePath.endsWith(".xml")) {
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    try {
      const xmlString: string = await fs.readFile(filePath, {
        encoding: "utf8",
      })
      const dossierLegislatif = parseDossierLegislatif(filePath, xmlString)
      if (dossierLegislatif === undefined) {
        break iterXmlFiles
      }

      if (dossierLegislatif.CONTENU.ECHEANCIER !== undefined) {
        if (!silent && verbose) {
          console.log(
            `Retrieving échéancier of dossier législatif ${dossierLegislatif.META.META_COMMUN.ID}…`,
          )
        }
        const dossierLegislatifUrl = `https://www.legifrance.gouv.fr/dossierlegislatif/${dossierLegislatif.META.META_COMMUN.ID}/`
        const dossierLegislatifHtml = await fetchHtmlPage(dossierLegislatifUrl)
        const { document: dossierLegislatifDocument } = new JSDOM(
          dossierLegislatifHtml,
        ).window
        const echeancierA = [
          ...dossierLegislatifDocument.querySelectorAll("a.marker").values(),
        ].filter((aElement) => aElement.innerHTML.trim() === "Echeancier")[0]
        if (echeancierA === undefined) {
          if (!silent) {
            console.warn(
              `Dossier législatif ${dossierLegislatif.META.META_COMMUN.ID} has no échéancier.`,
            )
          }
          continue
        }
        const echeancierRelativeUrl = echeancierA.getAttribute("href")
        if (echeancierRelativeUrl === null) {
          if (!silent) {
            console.warn(
              `Dossier législatif ${dossierLegislatif.META.META_COMMUN.ID} has no échéancier.`,
            )
          }
          continue
        }
        const echeancierHtml = await fetchHtmlPage(
          new URL(echeancierRelativeUrl, dossierLegislatifUrl).toString(),
        )
        const { document: echeancierDocument } = new JSDOM(echeancierHtml)
          .window
        const echeancierTable = echeancierDocument.querySelector(
          "div.dossier-legislatif-detail-contenu > table",
        )
        if (echeancierTable === null) {
          if (!silent) {
            console.warn(
              `Échéancier of dossier législatif ${dossierLegislatif.META.META_COMMUN.ID} has no table².`,
            )
          }
          continue
        }

        await fs.writeFile(
          path.join(
            echeanciersHtmlDir,
            `${dossierLegislatif.META.META_COMMUN.ID}_echeancier_table.html`,
          ),
          echeancierTable.outerHTML,
          { encoding: "utf-8" },
        )
      }
    } catch (e) {
      console.error(
        "An error occurred while handling dossier législatif XML file",
        filePath,
      )
      throw e
    }
  }

  cd(echeanciersHtmlDirName)
  await $`git add .`
  if ((await $`git diff --quiet --staged`.exitCode) !== 0) {
    changed = true
    const message = `Récupération des tables des échéanciers - ${new Date().toISOString()}`
    await $`git commit -m ${message} --quiet`
    if (push) {
      await $`git push`
    }
  }
  cd("..")

  return changed ? 0 : 10 // No new commit has been added to git repository.
}

async function fetchHtmlPage(url: string): Promise<string> {
  for (let retriesCount = 0; ; retriesCount++) {
    const response = await fetch(url)
    if (!response.ok) {
      if (retriesCount === 0) {
        console.warn(response.status, response.statusText)
        console.warn(JSON.stringify(response.headers, null, 2))
        console.warn(await response.text())
      }
      if (retriesCount < 10) {
        await sleep(30)
        console.info("Retrying…")
      } else {
        throw new Error(`Retrieval of HTML page at <${url}> failed`)
      }
    }
    return await response.text()
  }
}

function sleep(s: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, s * 1000))
}

sade("download_dole_html <dilaDir>", true)
  .describe(
    "Download DOLE HTML to retrieve informations that lack in open data (links of decrees in échéanciers, etc)",
  )
  .option("-p, --push", "Push dataset repository")
  .option("-r, --resume", "Resume import at given relative file path")
  .option("-s, --silent", "Hide log messages")
  .option("-v, --verbose", "Show all log messages")
  .example(
    "--resume dole/global/JORF/DOLE/00/00/36/07/36/JORFDOLE000036073697.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    process.exit(await downloadDoleHtml(dilaDir, options))
  })
  .parse(process.argv)
