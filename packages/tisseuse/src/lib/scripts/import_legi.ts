import { auditChain, auditRequire, strictAudit } from "@auditors/core"
import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import { auditId, auditVersions } from "$lib/auditors/legal"
import type {
  Article,
  SectionTa,
  Textelr,
  TexteVersion,
  Versions,
  XmlHeader,
} from "$lib/legal"
import { db } from "$lib/server/database"
import { walkDir } from "$lib/server/file_systems"

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "ARTICLE.BLOC_TEXTUEL.CONTENU",
    "TEXTE_VERSION.ABRO.CONTENU",
    "TEXTE_VERSION.CONTENU",
    "TEXTE_VERSION.NOTA.CONTENU",
    "TEXTE_VERSION.RECT.CONTENU",
    "TEXTE_VERSION.SIGNATAIRES.CONTENU",
    "TEXTE_VERSION.TP.CONTENU",
    "TEXTE_VERSION.VISAS.CONTENU",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

async function importLegi({ resume }: { resume?: string } = {}): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const articleRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM article
        WHERE id LIKE 'LEGI%'
      `
    ).map(({ id }) => id),
  )
  const idRemainingElis = new Set(
    (
      await db<{ eli: string }[]>`
        SELECT eli
        FROM id
      `
    ).map(({ eli }) => eli),
  )
  const sectionTaRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM section_ta
        WHERE id LIKE 'LEGI%'
      `
    ).map(({ id }) => id),
  )
  const textelrRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM textelr
        WHERE id LIKE 'LEGI%'
      `
    ).map(({ id }) => id),
  )
  const texteVersionRemainingElis = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM texte_version
        WHERE id LIKE 'LEGI%'
      `
    ).map(({ id }) => id),
  )
  const versionsRemainingElis = new Set(
    (
      await db<{ eli: string }[]>`
        SELECT eli
        FROM versions
      `
    ).map(({ eli }) => eli),
  )

  const dataDir = path.join("..", "dila-data", "legi")
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
        Article | SectionTa | Textelr | TexteVersion | Versions | XmlHeader,
      ][]) {
        switch (key) {
          case "?xml": {
            const xmlHeader = element as XmlHeader
            assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
            assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
            break
          }
          case "ARTICLE": {
            const article = element as Article
            await db`
              INSERT INTO article (
                id,
                data
              ) VALUES (
                ${article.META.META_COMMUN.ID},
                ${db.json(article as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(article as unknown as JSONValue)}
            `
            articleRemainingIds.delete(article.META.META_COMMUN.ID)
            break
          }
          case "ID": {
            assert.strictEqual(relativeSplitPath[0], "global")
            assert.strictEqual(relativeSplitPath[1], "eli")
            const eli = relativeSplitPath.slice(2, -1).join("/")
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
            assert
            await db`
              INSERT INTO id (
                eli,
                id
              ) VALUES (
                ${eli},
                ${id}
              )
              ON CONFLICT (eli)
              DO UPDATE SET
                id = ${id}
            `
            idRemainingElis.delete(eli)
            break
          }
          case "SECTION_TA": {
            const section = element as SectionTa
            await db`
              INSERT INTO section_ta (
                id,
                data
              ) VALUES (
                ${section.ID},
                ${db.json(section as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(section as unknown as JSONValue)}
            `
            sectionTaRemainingIds.delete(section.ID)
            break
          }
          case "TEXTE_VERSION": {
            const version = element as TexteVersion
            await db`
              INSERT INTO texte_version (
                id,
                data
              ) VALUES (
                ${version.META.META_COMMUN.ID},
                ${db.json(version as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(version as unknown as JSONValue)}
            `
            texteVersionRemainingElis.delete(version.META.META_COMMUN.ID)
            break
          }
          case "TEXTELR": {
            const textelr = element as Textelr
            await db`
              INSERT INTO textelr (
                id,
                data
              ) VALUES (
                ${textelr.META.META_COMMUN.ID},
                ${db.json(textelr as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(textelr as unknown as JSONValue)}
            `
            textelrRemainingIds.delete(textelr.META.META_COMMUN.ID)
            break
          }
          case "VERSIONS": {
            assert.strictEqual(relativeSplitPath[0], "global")
            assert.strictEqual(relativeSplitPath[1], "eli")
            const eli = relativeSplitPath.slice(2, -1).join("/")
            const [versions, versionsError] = auditChain(
              auditVersions,
              auditRequire,
            )(strictAudit, element)
            assert.strictEqual(
              versionsError,
              null,
              `Unexpected format for VERSIONS:\n${JSON.stringify(
                versions,
                null,
                2,
              )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
            )
            const id = versions.VERSION["@id"]
            await db`
              INSERT INTO versions (
                eli,
                id,
                data
              ) VALUES (
                ${eli},
                ${id},
                ${db.json(versions as unknown as JSONValue)}
              )
              ON CONFLICT (eli)
              DO UPDATE SET
                id = ${id},
                data = ${db.json(versions as unknown as JSONValue)}
            `
            versionsRemainingElis.delete(id)
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
    for (const id of articleRemainingIds) {
      console.log(`Deleting ARTICLE ${id}…`)
      await db`
        DELETE FROM article
        WHERE id = ${id}
      `
    }
    for (const eli of idRemainingElis) {
      console.log(`Deleting ID ${eli}…`)
      await db`
        DELETE FROM id
        WHERE eli = ${eli}
      `
    }
    for (const id of sectionTaRemainingIds) {
      console.log(`Deleting SECTION_TA ${id}…`)
      await db`
        DELETE FROM section_ta
        WHERE id = ${id}
      `
    }
    for (const id of textelrRemainingIds) {
      console.log(`Deleting TEXTELR ${id}…`)
      await db`
        DELETE FROM textelr
        WHERE id = ${id}
      `
    }
    for (const id of texteVersionRemainingElis) {
      console.log(`Deleting TEXTE_VERSION ${id}…`)
      await db`
        DELETE FROM texte_version
        WHERE id = ${id}
      `
    }
    for (const eli of versionsRemainingElis) {
      console.log(`Deleting VERSIONS ${eli}…`)
      await db`
        DELETE FROM versions
        WHERE eli = ${eli}
      `
    }
  }
}

sade("import_legi", true)
  .describe("Import Dila's LEGI database")
  .option("-r", "--resume", "Resume import at given relative file path")
  .example(
    "--resume global/eli/accord/2002/5/5/MESS0221690X/jo/article_1/versions.xml",
  )
  .action(async (options) => {
    await importLegi(options)
    process.exit(0)
  })
  .parse(process.argv)
