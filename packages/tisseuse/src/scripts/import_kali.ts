import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import type {
  Article,
  Idcc,
  SectionTa,
  Textekali,
  Textelr,
  TexteVersion,
  XmlHeader,
} from "$lib/legal"
import { db } from "$lib/server/database"
import { walkDir } from "$lib/server/file_systems"

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "ARTICLE.BLOC_TEXTUEL.CONTENU",
    "ARTICLE.NOTA.CONTENU",
    "ARTICLE.SM.CONTENU",
    "TEXTE_VERSION.ABRO.CONTENU",
    "TEXTE_VERSION.NOTA.CONTENU",
    "TEXTE_VERSION.NOTICE.CONTENU",
    "TEXTE_VERSION.RECT.CONTENU",
    "TEXTE_VERSION.SIGNATAIRES.CONTENU",
    "TEXTE_VERSION.SM.CONTENU",
    "TEXTE_VERSION.TP.CONTENU",
    "TEXTE_VERSION.VISAS.CONTENU",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

async function importKali({ resume }: { resume?: string } = {}): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const articleRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM article
        WHERE id LIKE 'KALI%'
      `
    ).map(({ id }) => id),
  )
  const idccRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM idcc
      `
    ).map(({ id }) => id),
  )
  const sectionTaRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM section_ta
        WHERE id LIKE 'KALI%'
      `
    ).map(({ id }) => id),
  )
  const textekaliRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM textekali
      `
    ).map(({ id }) => id),
  )
  const textelrRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM textelr
        WHERE id LIKE 'KALI%'
      `
    ).map(({ id }) => id),
  )
  const texteVersionRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM texte_version
        WHERE id LIKE 'KALI%'
      `
    ).map(({ id }) => id),
  )

  const dataDir = path.join("..", "dila-data", "kali")
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
        (
          | Article
          | Idcc
          | SectionTa
          | Textekali
          | Textelr
          | TexteVersion
          | XmlHeader
        ),
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
          case "IDCC": {
            const idcc = element as Idcc
            await db`
              INSERT INTO idcc (
                id,
                data
              ) VALUES (
                ${idcc.META.META_COMMUN.ID},
                ${db.json(idcc as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(idcc as unknown as JSONValue)}
            `
            idccRemainingIds.delete(idcc.META.META_COMMUN.ID)
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
            const texteVersion = element as TexteVersion
            const textAFragments = [
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
            ]
            await db`
              INSERT INTO texte_version (
                id,
                data,
                nature,
                text_search
              ) VALUES (
                ${texteVersion.META.META_COMMUN.ID},
                ${db.json(texteVersion as unknown as JSONValue)},
                ${texteVersion.META.META_COMMUN.NATURE}
                setweight(to_tsvector('french', ${textAFragments.join(
                  " ",
                )}), 'A')
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(texteVersion as unknown as JSONValue)},
                nature = ${texteVersion.META.META_COMMUN.NATURE},
                text_search = setweight(to_tsvector('french', ${textAFragments.join(
                  " ",
                )}), 'A')
            `
            texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            break
          }
          case "TEXTEKALI": {
            const textekali = element as Textekali
            await db`
              INSERT INTO textekali (
                id,
                data
              ) VALUES (
                ${textekali.META.META_COMMUN.ID},
                ${db.json(textekali as unknown as JSONValue)}
              )
              ON CONFLICT (id)
              DO UPDATE SET
                data = ${db.json(textekali as unknown as JSONValue)}
            `
            textekaliRemainingIds.delete(textekali.META.META_COMMUN.ID)
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
    for (const id of idccRemainingIds) {
      console.log(`Deleting IDCC ${id}…`)
      await db`
        DELETE FROM idcc
        WHERE id = ${id}
      `
    }
    for (const id of sectionTaRemainingIds) {
      console.log(`Deleting SECTION_TA ${id}…`)
      await db`
        DELETE FROM section_ta
        WHERE id = ${id}
      `
    }
    for (const id of textekaliRemainingIds) {
      console.log(`Deleting TEXTEKALI ${id}…`)
      await db`
        DELETE FROM textekali
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
    for (const id of texteVersionRemainingIds) {
      console.log(`Deleting TEXTE_VERSION ${id}…`)
      await db`
        DELETE FROM texte_version
        WHERE id = ${id}
      `
    }
  }
}

sade("import_kali", true)
  .describe("Import Dila's KALI database")
  .option("-r", "--resume", "Resume import at given relative file path")
  .example(
    "--resume global/conteneur/KALI/CONT/00/00/05/63/50/KALICONT000005635082.xml",
  )
  .action(async (options) => {
    await importKali(options)
    process.exit(0)
  })
  .parse(process.argv)
