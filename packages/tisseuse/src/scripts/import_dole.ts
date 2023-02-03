import { auditChain, auditRequire, strictAudit } from "@auditors/core"
import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import { auditDossierLegislatif } from "$lib/auditors/dossiers_legislatifs"
import type { DossierLegislatif, XmlHeader } from "$lib/legal"
import { db } from "$lib/server/database"
import { walkDir } from "$lib/server/file_systems"

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_1",
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_2",
    "DOSSIER_LEGISLATIF.CONTENU.EXPOSE_MOTIF",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

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
      if (relativePath.startsWith(resume!)) {
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
      const xmlData = xmlParser.parse(xmlString)
      for (const [key, element] of Object.entries(xmlData) as [
        string,
        DossierLegislatif | XmlHeader,
      ][]) {
        switch (key) {
          case "?xml": {
            const xmlHeader = element as XmlHeader
            assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
            assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
            break
          }
          case "DOSSIER_LEGISLATIF": {
            const [dossierLegislatif, error] = auditChain(
              auditDossierLegislatif,
              auditRequire,
            )(strictAudit, element) as [DossierLegislatif, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for DOSSIER_LEGISLATIF:\n${JSON.stringify(
                dossierLegislatif,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
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
            break
          }
          default: {
            console.warn(
              `Unexpected root element "${key}" in XML file: ${filePath}`,
            )
            break iterXmlFiles
          }
        }
      }
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
