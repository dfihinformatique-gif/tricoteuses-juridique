import assert from "assert"
import nodegit from "nodegit"
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
} from "$lib/legal/index.js"
import { xmlParser } from "$lib/parsers/shared.js"
import { db } from "$lib/server/databases/index.js"
import { walkTree } from "$lib/server/nodegit/trees.js"

async function importKali(
  dilaDir: string,
  {
    "dry-run": dryRun,
    resume,
    verbose,
  }: {
    "dry-run"?: boolean
    resume?: string
    verbose?: boolean
  } = {},
): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const articleRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM article
            WHERE id LIKE 'KALI%'
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()
  const idccRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM idcc
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()
  const sectionTaRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM section_ta
            WHERE id LIKE 'KALI%'
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()
  const textekaliRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM textekali
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()
  const textelrRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM textelr
            WHERE id LIKE 'KALI%'
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()
  const texteVersionRemainingIds = !dryRun
    ? new Set(
        (
          await db<{ id: string }[]>`
            SELECT id
            FROM texte_version
            WHERE id LIKE 'KALI%'
          `
        ).map(({ id }) => id),
      )
    : new Set<string>()

  const repository = await nodegit.Repository.open(
    path.join(dilaDir, "kali.git"),
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
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    try {
      const blob = await entry.getBlob()
      const buffer = blob.content()
      const xmlString = buffer.toString("utf8")
      const xmlData = xmlParser.parse(xmlString)
      for (const [key, element] of Object.entries(xmlData) as [
        string,
        unknown,
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
            if (!dryRun) {
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
            }
            articleRemainingIds.delete(article.META.META_COMMUN.ID)
            break
          }
          case "IDCC": {
            const idcc = element as Idcc
            if (!dryRun) {
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
                  data = EXCLUDED.data
                WHERE idcc.data IS DISTINCT FROM EXCLUDED.data
              `
            }
            idccRemainingIds.delete(idcc.META.META_COMMUN.ID)
            break
          }
          case "SECTION_TA": {
            const section = element as SectionTa
            if (!dryRun) {
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
            }
            sectionTaRemainingIds.delete(section.ID)
            break
          }
          case "TEXTE_VERSION": {
            const texteVersion = element as TexteVersion
            const textAFragments = [
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
              texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
            ].filter((text) => text !== undefined)
            if (!dryRun) {
              await db`
                INSERT INTO texte_version (
                  id,
                  data,
                  nature,
                  text_search
                ) VALUES (
                  ${texteVersion.META.META_COMMUN.ID},
                  ${db.json(texteVersion as unknown as JSONValue)},
                  ${texteVersion.META.META_COMMUN.NATURE},
                  setweight(to_tsvector('french', ${textAFragments.join(
                    " ",
                  )}), 'A')
                )
                ON CONFLICT (id)
                DO UPDATE SET
                  data = EXCLUDED.data,
                  nature = EXCLUDED.nature,
                  text_search = EXCLUDED.text_search
                WHERE
                  texte_version.data IS DISTINCT FROM EXCLUDED.data OR
                  texte_version.nature IS DISTINCT FROM EXCLUDED.nature OR
                  texte_version.text_search IS DISTINCT FROM EXCLUDED.text_search
              `
            }
            texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            break
          }
          case "TEXTEKALI": {
            const textekali = element as Textekali
            if (!dryRun) {
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
                  data = EXCLUDED.data
                WHERE textekali.data IS DISTINCT FROM EXCLUDED.data
              `
            }
            textekaliRemainingIds.delete(textekali.META.META_COMMUN.ID)
            break
          }
          case "TEXTELR": {
            const textelr = element as Textelr
            if (!dryRun) {
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
            }
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

  if (!dryRun && deleteRemainingIds) {
    for (const id of articleRemainingIds) {
      if (verbose) {
        console.log(`Deleting ARTICLE ${id}…`)
      }
      await db`
        DELETE FROM article
        WHERE id = ${id}
      `
    }
    for (const id of idccRemainingIds) {
      if (verbose) {
        console.log(`Deleting IDCC ${id}…`)
      }
      await db`
        DELETE FROM idcc
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
    for (const id of textekaliRemainingIds) {
      if (verbose) {
        console.log(`Deleting TEXTEKALI ${id}…`)
      }
      await db`
        DELETE FROM textekali
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
  }
}

sade("import_kali <dilaDir>", true)
  .describe("Import Dila's KALI database")
  .option("-d, --dry-run", "Validate only; don't update database")
  .option("-r, --resume", "Resume import at given relative file path")
  .option("-v, --verbose", "Show more log messages")
  .example(
    "--resume global/conteneur/KALI/CONT/00/00/05/63/50/KALICONT000005635082.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    await importKali(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
