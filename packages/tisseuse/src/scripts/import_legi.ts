import {
  auditChain,
  auditOptions,
  auditRequire,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import { auditId, auditVersions } from "$lib/auditors/legal"
import {
  auditLegiArticle,
  auditLegiSectionTa,
  auditLegiTextelr,
  auditLegiTexteVersion,
  // legiArticleStats
  // legiSectionTaStats,
  // legiTextelrStats,
  // legiTexteVersionStats,
} from "$lib/auditors/legi"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
  Versions,
  XmlHeader,
} from "$lib/legal"
import { db } from "$lib/server/databases"
import { walkDir } from "$lib/server/file_systems"

type CategoryTag = (typeof allCategoriesCode)[number]

const allCategoriesCode = [
  "ARTICLE",
  "ID",
  "SECTION_TA",
  "TEXTE_VERSION",
  "TEXTELR",
  "VERSIONS",
] as const

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

async function importLegi(
  dilaDir: string,
  { category, resume }: { category?: string; resume?: string } = {},
): Promise<void> {
  const [categoryTag, categoryError] = auditOptions([
    ...[...allCategoriesCode],
  ])(strictAudit, category) as [CategoryTag | undefined, unknown]
  assert.strictEqual(
    categoryError,
    null,
    `Error for category ${JSON.stringify(categoryTag)}:\n${JSON.stringify(
      categoryError,
      null,
      2,
    )}`,
  )
  let skip = resume !== undefined

  const deleteRemainingIds = !skip

  const articleRemainingIds =
    categoryTag === undefined || categoryTag === "ARTICLE"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM article
              WHERE id LIKE 'LEGI%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const idRemainingElis =
    categoryTag === undefined || categoryTag === "ID"
      ? new Set(
          (
            await db<{ eli: string }[]>`
              SELECT eli
              FROM id
            `
          ).map(({ eli }) => eli),
        )
      : new Set<string>()
  const sectionTaRemainingIds =
    categoryTag === undefined || categoryTag === "SECTION_TA"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM section_ta
              WHERE id LIKE 'LEGI%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const textelrRemainingIds =
    categoryTag === undefined || categoryTag === "TEXTELR"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM textelr
              WHERE id LIKE 'LEGI%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const texteVersionRemainingIds =
    categoryTag === undefined || categoryTag === "TEXTE_VERSION"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM texte_version
              WHERE id LIKE 'LEGI%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const versionsRemainingElis =
    categoryTag === undefined || categoryTag === "VERSIONS"
      ? new Set(
          (
            await db<{ eli: string }[]>`
              SELECT eli
              FROM versions
            `
          ).map(({ eli }) => eli),
        )
      : new Set<string>()

  const dataDir = path.join(dilaDir, "legi")
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
      if (
        filePath.includes("/eli/") &&
        (await fs.lstat(filePath)).isSymbolicLink()
      ) {
        // Ignore ELI symbolic links, because the name of the link is present in TexteVersion.
        continue
      }
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    try {
      const xmlString: string = await fs.readFile(filePath, {
        encoding: "utf8",
      })
      const xmlData = xmlParser.parse(xmlString)
      for (const [tag, element] of Object.entries(xmlData) as [
        CategoryTag | "?xml",
        (
          | LegiArticle
          | LegiSectionTa
          | LegiTextelr
          | LegiTexteVersion
          | Versions
          | XmlHeader
        ),
      ][]) {
        switch (tag) {
          case "?xml": {
            const xmlHeader = element as XmlHeader
            assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
            assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
            break
          }
          case "ARTICLE":
            if (categoryTag === undefined || categoryTag === tag) {
              const [article, error] = auditChain(
                auditLegiArticle,
                auditRequire,
              )(strictAudit, element) as [LegiArticle, unknown]
              assert.strictEqual(
                error,
                null,
                `Unexpected format for ARTICLE:\n${JSON.stringify(
                  article,
                  null,
                  2,
                )}\nError:\n${JSON.stringify(error, null, 2)}`,
              )
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
            }
            break
          case "ID":
            if (categoryTag === undefined || categoryTag === tag) {
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
            }
            break
          case "SECTION_TA":
            if (categoryTag === undefined || categoryTag === tag) {
              const [section, error] = auditChain(
                auditLegiSectionTa,
                auditRequire,
              )(strictAudit, element) as [LegiSectionTa, unknown]
              assert.strictEqual(
                error,
                null,
                `Unexpected format for SECTION_TA:\n${JSON.stringify(
                  section,
                  null,
                  2,
                )}\nError:\n${JSON.stringify(error, null, 2)}`,
              )
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
            }
            break
          case "TEXTE_VERSION":
            if (categoryTag === undefined || categoryTag === tag) {
              const [texteVersion, error] = auditChain(
                auditLegiTexteVersion,
                auditRequire,
              )(strictAudit, element) as [LegiTexteVersion, unknown]
              assert.strictEqual(
                error,
                null,
                `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
                  texteVersion,
                  null,
                  2,
                )}\nError:\n${JSON.stringify(error, null, 2)}`,
              )
              const textAFragments = [
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
              ].filter((text) => text !== undefined)
              await db`
                INSERT INTO texte_version (
                  id,
                  data,
                  nature,
                  text_search
                ) VALUES (
                  ${texteVersion.META.META_COMMUN.ID},
                  ${db.json(texteVersion as unknown as JSONValue)},
                  ${texteVersion.META.META_COMMUN.NATURE ?? ""},
                  setweight(to_tsvector('french', ${textAFragments.join(
                    " ",
                  )}), 'A')
                )
                ON CONFLICT (id)
                DO UPDATE SET
                  data = ${db.json(texteVersion as unknown as JSONValue)},
                  nature = ${texteVersion.META.META_COMMUN.NATURE ?? ""},
                  text_search = setweight(to_tsvector('french', ${textAFragments.join(
                    " ",
                  )}), 'A')
              `
              texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            }
            break
          case "TEXTELR":
            if (categoryTag === undefined || categoryTag === tag) {
              const [textelr, error] = auditChain(
                auditLegiTextelr,
                auditRequire,
              )(strictAudit, element) as [LegiTextelr, unknown]
              assert.strictEqual(
                error,
                null,
                `Unexpected format for TEXTELR:\n${JSON.stringify(
                  textelr,
                  null,
                  2,
                )}\nError:\n${JSON.stringify(error, null, 2)}`,
              )
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
            }
            break
          case "VERSIONS":
            if (categoryTag === undefined || categoryTag === tag) {
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
            }
            break
          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${filePath}`,
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
    for (const id of texteVersionRemainingIds) {
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
  // console.log(
  //   "LEGI ARTICLE stats =",
  //   JSON.stringify(legiArticleStats, null, 2),
  // )
  // console.log(
  //   "LEGI SECTION_TA stats =",
  //   JSON.stringify(legiSectionTaStats, null, 2),
  // )
  // console.log("LEGI TEXTELR stats =", JSON.stringify(legiTextelrStats, null, 2))
  // console.log(
  //   "LEGI TEXTE_VERSION stats =",
  //   JSON.stringify(legiTexteVersionStats, null, 2),
  // )
}

sade("import_legi <dilaDir>", true)
  .describe("Import Dila's LEGI database")
  .option("-r, --resume", "Resume import at given relative file path")
  .example(
    "--resume global/eli/accord/2002/5/5/MESS0221690X/jo/article_1/versions.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    await importLegi(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
