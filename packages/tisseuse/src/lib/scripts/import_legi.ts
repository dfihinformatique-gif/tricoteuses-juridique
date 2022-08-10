import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import type {
  Article,
  EliId,
  EliVersions,
  Section,
  Struct,
  Version,
} from "$lib/data"
import { db } from "$lib/server/database"
import { walkDir } from "$lib/server/file_systems"

interface XmlHeader {
  "@encoding": "UTF-8"
  "@version": "1.0"
}

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: ["ARTICLE.BLOC_TEXTUEL.CONTENU", "TEXTE_VERSION.CONTENU"],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

async function importLegi({ resume }: { resume?: string } = {}): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const articlesRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM articles
      `
    ).map(({ id }) => id),
  )
  const eliIdsRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM eli_ids
      `
    ).map(({ id }) => id),
  )
  const eliVersionsRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM eli_versions
      `
    ).map(({ id }) => id),
  )
  const sectionsRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM sections
      `
    ).map(({ id }) => id),
  )
  const structsRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM structs
      `
    ).map(({ id }) => id),
  )
  const versionsRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM versions
      `
    ).map(({ id }) => id),
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
    const xmlString: string = await fs.readFile(filePath, {
      encoding: "utf8",
    })
    const xmlData = xmlParser.parse(xmlString)
    for (const [key, element] of Object.entries(xmlData) as [
      string,
      Article | EliId | EliVersions | Section | Struct | Version | XmlHeader,
    ][]) {
      switch (key) {
        case "?xml":
          const xmlHeader = element as XmlHeader
          assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
          assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
          break
        case "ARTICLE": {
          const article = element as Article
          await db`
            INSERT INTO articles (
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
          articlesRemainingIds.delete(article.META.META_COMMUN.ID)
          break
        }
        case "ID": {
          assert.strictEqual(relativeSplitPath[0], "global")
          assert.strictEqual(relativeSplitPath[1], "eli")
          const id = relativeSplitPath.slice(2, -1).join("/")
          const eliId = element as EliId
          await db`
            INSERT INTO eli_ids (
              id,
              data
            ) VALUES (
              ${id},
              ${db.json(eliId as unknown as JSONValue)}
            )
            ON CONFLICT (id)
            DO UPDATE SET
              data = ${db.json(eliId as unknown as JSONValue)}
          `
          eliIdsRemainingIds.delete(id)
          break
        }
        case "SECTION_TA": {
          const section = element as Section
          await db`
            INSERT INTO sections (
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
          sectionsRemainingIds.delete(section.ID)
          break
        }
        case "TEXTELR": {
          const struct = element as Struct
          await db`
            INSERT INTO structs (
              id,
              data
            ) VALUES (
              ${struct.META.META_COMMUN.ID},
              ${db.json(struct as unknown as JSONValue)}
            )
            ON CONFLICT (id)
            DO UPDATE SET
              data = ${db.json(struct as unknown as JSONValue)}
          `
          structsRemainingIds.delete(struct.META.META_COMMUN.ID)
          break
        }
        case "TEXTE_VERSION": {
          const version = element as Version
          await db`
            INSERT INTO versions (
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
          versionsRemainingIds.delete(version.META.META_COMMUN.ID)
          break
        }
        case "VERSIONS": {
          assert.strictEqual(relativeSplitPath[0], "global")
          assert.strictEqual(relativeSplitPath[1], "eli")
          const id = relativeSplitPath.slice(2, -1).join("/")
          const eliVersion = element as EliVersions
          await db`
            INSERT INTO eli_versions (
              id,
              data
            ) VALUES (
              ${id},
              ${db.json(eliVersion as unknown as JSONValue)}
            )
            ON CONFLICT (id)
            DO UPDATE SET
              data = ${db.json(eliVersion as unknown as JSONValue)}
          `
          eliVersionsRemainingIds.delete(id)
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
    // console.log(filePath)
    // console.log(JSON.stringify(xmlData, null, 2))
  }

  if (deleteRemainingIds) {
    for (const id of articlesRemainingIds) {
      console.log(`Deleting article ${id}…`)
      await db`
        DELETE FROM articles
        WHERE id = ${id}
      `
    }
    for (const id of eliIdsRemainingIds) {
      console.log(`Deleting ELI ID ${id}…`)
      await db`
        DELETE FROM eli_ids
        WHERE id = ${id}
      `
    }
    for (const id of eliVersionsRemainingIds) {
      console.log(`Deleting ELI versions ${id}…`)
      await db`
        DELETE FROM eli_versions
        WHERE id = ${id}
      `
    }
    for (const id of sectionsRemainingIds) {
      console.log(`Deleting section ${id}…`)
      await db`
        DELETE FROM sections
        WHERE id = ${id}
      `
    }
    for (const id of structsRemainingIds) {
      console.log(`Deleting struct ${id}…`)
      await db`
        DELETE FROM structs
        WHERE id = ${id}
      `
    }
    for (const id of versionsRemainingIds) {
      console.log(`Deleting version ${id}…`)
      await db`
        DELETE FROM versions
        WHERE id = ${id}
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
