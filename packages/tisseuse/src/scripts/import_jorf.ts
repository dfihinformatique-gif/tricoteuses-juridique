import {
  auditChain,
  auditOptions,
  auditRequire,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import nodegit from "nodegit"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import { auditId, auditVersions } from "$lib/auditors/legal.js"
import {
  auditJorfArticle,
  // jorfArticleStats,
} from "$lib/auditors/jorf/articles.js"
import {
  auditJo,
  // joStats,
} from "$lib/auditors/jorf/jo.js"
import {
  auditJorfSectionTa,
  // jorfSectionTaStats,
} from "$lib/auditors/jorf/section_ta.js"
import {
  auditJorfTexteVersion,
  // jorfTexteVersionStats,
} from "$lib/auditors/jorf/texte_version.js"
import {
  auditJorfTextelr,
  // jorfTextelrStats,
} from "$lib/auditors/jorf/textelr.js"
import type { XmlHeader } from "$lib/legal/index.js"
import {
  allJorfCategoriesTags,
  type Jo,
  type JorfArticle,
  type JorfCategorieTag,
  type JorfSectionTa,
  type JorfTextelr,
  type JorfTexteVersion,
} from "$lib/legal/jorf.js"
import { xmlParser } from "$lib/parsers/shared.js"
import { db } from "$lib/server/databases/index.js"
import { walkTree } from "$lib/server/nodegit/trees.js"

async function importJorf(
  dilaDir: string,
  {
    category,
    resume,
    verbose,
  }: { category?: string; resume?: string; verbose?: boolean } = {},
): Promise<void> {
  const [categorieTag, categorieError] = auditOptions([
    ...[...allJorfCategoriesTags],
  ])(strictAudit, category) as [JorfCategorieTag | undefined, unknown]
  assert.strictEqual(
    categorieError,
    null,
    `Error for category ${JSON.stringify(categorieTag)}:\n${JSON.stringify(
      categorieError,
      null,
      2,
    )}`,
  )
  let skip = resume !== undefined

  const deleteRemainingIds = !skip

  const articleRemainingIds =
    categorieTag === undefined || categorieTag === "ARTICLE"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM article
              WHERE id LIKE 'JORF%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const idRemainingElis =
    categorieTag === undefined || categorieTag === "ID"
      ? new Set(
          (
            await db<{ eli: string }[]>`
              SELECT eli
              FROM id
            `
          ).map(({ eli }) => eli),
        )
      : new Set<string>()
  const joRemainingIds =
    categorieTag === undefined || categorieTag === "JO"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM jo
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const sectionTaRemainingIds =
    categorieTag === undefined || categorieTag === "SECTION_TA"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM section_ta
              WHERE id LIKE 'JORF%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const textelrRemainingIds =
    categorieTag === undefined || categorieTag === "TEXTELR"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM textelr
              WHERE id LIKE 'JORF%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const texteVersionRemainingIds =
    categorieTag === undefined || categorieTag === "TEXTE_VERSION"
      ? new Set(
          (
            await db<{ id: string }[]>`
              SELECT id
              FROM texte_version
              WHERE id LIKE 'JORF%'
            `
          ).map(({ id }) => id),
        )
      : new Set<string>()
  const versionsRemainingElis =
    categorieTag === undefined || categorieTag === "VERSIONS"
      ? new Set(
          (
            await db<{ eli: string }[]>`
              SELECT eli
              FROM versions
            `
          ).map(({ eli }) => eli),
        )
      : new Set<string>()

  const repository = await nodegit.Repository.open(
    path.join(dilaDir, "jorf.git"),
  )
  const headReference = await repository.head()
  const commit = await repository.getCommit(headReference.target())
  const tree = await commit.getTree()

  iterXmlFiles: for await (const entry of walkTree(repository, tree)) {
    if (entry.isTree()) {
      continue
    }

    const filePath = entry.path()
    if (skip) {
      if (filePath.startsWith(resume as string)) {
        skip = false
        console.log(`Resuming at file ${filePath}...`)
      } else {
        continue
      }
    }

    if (!filePath.endsWith(".xml")) {
      if (
        filePath.includes("/eli/") &&
        (entry.filemode() & 0o120000) === 0o120000 // nodegit.TreeEntry.FILEMODE.LINK
      ) {
        // Ignore ELI symbolic links, because the name of the link is present in TexteVersion.
        continue
      }
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    const fileSplitPath = filePath.split("/")
    try {
      const blob = await entry.getBlob()
      const buffer = blob.content()
      const xmlString = buffer.toString("utf8")
      const xmlData = xmlParser.parse(xmlString)
      for (const [tag, element] of Object.entries(xmlData) as [
        JorfCategorieTag | "?xml",
        unknown,
      ][]) {
        switch (tag) {
          case "?xml": {
            const xmlHeader = element as XmlHeader
            assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
            assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
            break
          }

          case "ARTICLE":
            if (categorieTag === undefined || categorieTag === tag) {
              const [article, error] = auditChain(
                auditJorfArticle,
                auditRequire,
              )(strictAudit, element) as [JorfArticle, unknown]
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
                  data = EXCLUDED.data
                WHERE article.data IS DISTINCT FROM EXCLUDED.data
              `
              articleRemainingIds.delete(article.META.META_COMMUN.ID)
            }
            break

          case "ID":
            if (categorieTag === undefined || categorieTag === tag) {
              assert.strictEqual(fileSplitPath[0], "global")
              assert.strictEqual(fileSplitPath[1], "eli")
              const eli = fileSplitPath.slice(2, -1).join("/")
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
                  id = EXCLUDED.id
                WHERE id.id IS DISTINCT FROM EXCLUDED.id
              `
              idRemainingElis.delete(eli)
            }
            break
          case "JO":
            if (categorieTag === undefined || categorieTag === tag) {
              const [jo, error] = auditChain(auditJo, auditRequire)(
                strictAudit,
                element,
              ) as [Jo, unknown]
              assert.strictEqual(
                error,
                null,
                `Unexpected format for JO:\n${JSON.stringify(
                  jo,
                  null,
                  2,
                )}\nError:\n${JSON.stringify(error, null, 2)}`,
              )
              await db`
                INSERT INTO jo (
                  id,
                  data
                ) VALUES (
                  ${jo.META.META_COMMUN.ID},
                  ${db.json(jo as unknown as JSONValue)}
                )
                ON CONFLICT (id)
                DO UPDATE SET
                  data = EXCLUDED.data
                WHERE jo.data IS DISTINCT FROM EXCLUDED.data
              `
              joRemainingIds.delete(jo.META.META_COMMUN.ID)
            }
            break
          case "SECTION_TA":
            if (categorieTag === undefined || categorieTag === tag) {
              const [section, error] = auditChain(
                auditJorfSectionTa,
                auditRequire,
              )(strictAudit, element) as [JorfSectionTa, unknown]
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
                  data = EXCLUDED.data
                WHERE section_ta.data IS DISTINCT FROM EXCLUDED.data
              `
              sectionTaRemainingIds.delete(section.ID)
            }
            break
          case "TEXTE_VERSION":
            if (categorieTag === undefined || categorieTag === tag) {
              const [texteVersion, error] = auditChain(
                auditJorfTexteVersion,
                auditRequire,
              )(strictAudit, element) as [JorfTexteVersion, unknown]
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
              const natureEtNum =
                texteVersion.META.META_COMMUN.NATURE !== undefined &&
                texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM !==
                  undefined
                  ? `${texteVersion.META.META_COMMUN.NATURE.toUpperCase()}.${texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM}`
                  : null
              await db`
                INSERT INTO texte_version (
                  id,
                  data,
                  nature,
                  nature_et_num,
                  text_search
                ) VALUES (
                  ${texteVersion.META.META_COMMUN.ID},
                  ${db.json(texteVersion as unknown as JSONValue)},
                  ${texteVersion.META.META_COMMUN.NATURE ?? null},
                  ${natureEtNum},
                  setweight(to_tsvector('french', ${textAFragments.join(
                    " ",
                  )}), 'A')
                )
                ON CONFLICT (id)
                DO UPDATE SET
                  data = EXCLUDED.data,
                  nature = EXCLUDED.nature,
                  nature_et_num = EXCLUDED.nature_et_num,
                  text_search = EXCLUDED.text_search
                WHERE texte_version.data IS DISTINCT FROM EXCLUDED.data
                   OR texte_version.nature IS DISTINCT FROM EXCLUDED.nature
                   OR texte_version.nature_et_num IS DISTINCT FROM EXCLUDED.nature_et_num
                   OR texte_version.text_search IS DISTINCT FROM EXCLUDED.text_search
              `
              texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            }
            break
          case "TEXTELR":
            if (categorieTag === undefined || categorieTag === tag) {
              const [textelr, error] = auditChain(
                auditJorfTextelr,
                auditRequire,
              )(strictAudit, element) as [JorfTextelr, unknown]
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
                  data = EXCLUDED.data
                WHERE textelr.data IS DISTINCT FROM EXCLUDED.data
              `
              textelrRemainingIds.delete(textelr.META.META_COMMUN.ID)
            }
            break
          case "VERSIONS":
            if (categorieTag === undefined || categorieTag === tag) {
              assert.strictEqual(fileSplitPath[0], "global")
              assert.strictEqual(fileSplitPath[1], "eli")
              const eli = fileSplitPath.slice(2, -1).join("/")
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
                  id = EXCLUDED.id,
                  data = EXCLUDED.data
                WHERE versions.id IS DISTINCT FROM EXCLUDED.id
                   OR versions.data IS DISTINCT FROM EXCLUDED.data
              `
              versionsRemainingElis.delete(eli) // Corrected: Use eli here as it's the key for versionsRemainingElis set and conflict key.
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
      if (verbose) {
        console.log(`Deleting ARTICLE ${id}…`)
      }
      await db`
        DELETE FROM article
        WHERE id = ${id}
      `
    }
    for (const eli of idRemainingElis) {
      if (verbose) {
        console.log(`Deleting ID ${eli}…`)
      }
      await db`
        DELETE FROM id
        WHERE eli = ${eli}
      `
    }
    for (const id of joRemainingIds) {
      if (verbose) {
        console.log(`Deleting JO ${id}…`)
      }
      await db`
        DELETE FROM jo
        WHERE id = ${id}
      `
    }
    for (const id of sectionTaRemainingIds) {
      if (verbose) {
        console.log(`Deleting SECTION_TA ${id}…`)
      }
      await db`
        DELETE FROM section_ta
        WHERE id = ${id}
      `
    }
    for (const id of textelrRemainingIds) {
      if (verbose) {
        console.log(`Deleting TEXTELR ${id}…`)
      }
      await db`
        DELETE FROM textelr
        WHERE id = ${id}
      `
    }
    for (const id of texteVersionRemainingIds) {
      if (verbose) {
        console.log(`Deleting TEXTE_VERSION ${id}…`)
      }
      await db`
        DELETE FROM texte_version
        WHERE id = ${id}
      `
    }
    for (const eli of versionsRemainingElis) {
      if (verbose) {
        console.log(`Deleting VERSIONS ${eli}…`)
      }
      await db`
        DELETE FROM versions
        WHERE eli = ${eli}
      `
    }
  }

  // console.log(
  //   "JORF ARTICLE stats =",
  //   JSON.stringify(jorfArticleStats, null, 2),
  // )
  // console.log("JO stats =", JSON.stringify(joStats, null, 2))
  // console.log(
  //   "JORF SECTION_TA stats =",
  //   JSON.stringify(jorfSectionTaStats, null, 2),
  // )
  // console.log("JORF TEXTELR stats =", JSON.stringify(jorfTextelrStats, null, 2))
  // console.log(
  //   "JORF TEXTE_VERSION stats =",
  //   JSON.stringify(jorfTexteVersionStats, null, 2),
  // )
}

sade("import_jorf <dilaDir>", true)
  .describe("Import Dila's JORF database")
  .option("-k, --category", "Import only given type of data")
  .option("-r, --resume", "Resume import at given relative file path")
  .option("-v, --verbose", "Show more log messages")
  .example(
    "--resume global/eli/accord/2002/5/5/MESS0221690X/jo/article_1/versions.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    await importJorf(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
