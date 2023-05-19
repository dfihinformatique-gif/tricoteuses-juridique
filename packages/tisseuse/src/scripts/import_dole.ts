import assert from "assert"
import fs from "fs-extra"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import { parseDossierLegislatif } from "$lib/parsers"
import { db } from "$lib/server/databases"
import { walkDir } from "$lib/server/file_systems"

async function importDole(
  dilaDir: string,
  { resume }: { resume?: string } = {},
): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const dossierLegislatifRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM dossier_legislatif
      `
    ).map(({ id }) => id),
  )

  const dataDir = path.join(dilaDir, "dole")
  assert(await fs.pathExists(dataDir))
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
      await db`
        INSERT INTO dossier_legislatif (
          id,
          data
        ) VALUES (
          ${dossierLegislatif.META.META_COMMUN.ID},
          ${db.json(dossierLegislatif as unknown as JSONValue)}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          data = ${db.json(dossierLegislatif as unknown as JSONValue)}
      `
      dossierLegislatifRemainingIds.delete(
        dossierLegislatif.META.META_COMMUN.ID,
      )
    } catch (e) {
      console.error("An error occurred while parsing XML file", filePath)
      throw e
    }
  }

  if (deleteRemainingIds) {
    for (const id of dossierLegislatifRemainingIds) {
      console.log(`Deleting DOSSIER_LEGISLATIF ${id}…`)
      await db`
        DELETE FROM dossier_legislatif
        WHERE id = ${id}
      `
    }
  }
}

sade("import_dole <dilaDir>", true)
  .describe("Import Dila's DOLE database")
  .option("-r, --resume", "Resume import at given relative file path")
  .example(
    "--resume dole/global/JORF/DOLE/00/00/36/07/36/JORFDOLE000036073697.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    await importDole(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
