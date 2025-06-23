import objectHash from "object-hash"
import sade from "sade"

import { db } from "$lib/server/databases/index.js"
import type {
  LegiArticleLien,
  LegiArticleLienType,
  LegiTexteVersionLien,
  LegiTexteVersionLienType,
} from "$lib/legal/legi.js"
import type {
  JorfTexteVersionLien,
  JorfTexteVersionLienType,
} from "$lib/legal/jorf.js"

async function indexLiens(): Promise<void> {
  console.log("Indexing articles links…")
  const articlesAvecLiensCursor = db<
    {
      id: string
      liens: Array<LegiArticleLien>
    }[]
  >`
    SELECT
      id,
      data -> 'LIENS' -> 'LIEN' AS liens
    FROM article
    WHERE
      id LIKE 'LEGIART%'
      AND data -> 'LIENS' -> 'LIEN' IS NOT NULL
  `.cursor(100)
  for await (const rows of articlesAvecLiensCursor) {
    for (const { id, liens } of rows) {
      const existingLienByHash = new Map(
        (
          await db<
            {
              cible: boolean
              cidtexte: string | null
              id: string
              typelien: LegiArticleLienType
            }[]
          >`
          SELECT cible, cidtexte, id, typelien
          FROM article_lien
          WHERE article_id = ${id}
        `
        ).map((lien) => [objectHash(lien), lien]),
      )

      for (const lien of liens) {
        if (lien["@id"] === undefined) {
          continue
        }
        existingLienByHash.delete(
          objectHash({
            cible: lien["@sens"] === "cible",
            cidtexte: lien["@cidtexte"] ?? null,
            id: lien["@id"],
            typelien: lien["@typelien"],
          }),
        )
        await db`
          INSERT INTO article_lien (
            article_id,
            cible,
            cidtexte,
            id,
            typelien
          ) VALUES (
            ${id},
            ${lien["@sens"] === "cible"},
            ${lien["@cidtexte"] ?? null},
            ${lien["@id"]},
            ${lien["@typelien"]}
          )
          ON CONFLICT
          DO NOTHING
        `
      }

      for (const {
        cible,
        cidtexte,
        id: linkedId,
        typelien,
      } of existingLienByHash.values()) {
        await db`
          DELETE FROM article_lien
          WHERE
            article_id = ${id}
            AND cible = ${cible}
            AND cidtexte = ${cidtexte}
            AND id = ${linkedId}
            AND typelien = ${typelien}
        `
      }
    }
  }

  console.log("Indexing textes versions links…")
  const textesVersionsAvecLiensCursor = db<
    {
      id: string
      liens: Array<JorfTexteVersionLien | LegiTexteVersionLien>
    }[]
  >`
    SELECT
      id,
      data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_VERSION' -> 'LIENS' -> 'LIEN' AS liens
    FROM texte_version
    WHERE
      (id LIKE 'JORFTEXT%' OR id LIKE 'LEGITEXT%')
      AND data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_VERSION' -> 'LIENS' -> 'LIEN' IS NOT NULL
  `.cursor(100)
  for await (const rows of textesVersionsAvecLiensCursor) {
    for (const { id, liens } of rows) {
      const existingLienByHash = new Map(
        (
          await db<
            {
              cible: boolean
              cidtexte: string | null
              id: string
              typelien: JorfTexteVersionLienType | LegiTexteVersionLienType
            }[]
          >`
          SELECT cible, cidtexte, id, typelien
          FROM texte_version_lien
          WHERE texte_version_id = ${id}
        `
        ).map((lien) => [objectHash(lien), lien]),
      )

      for (const lien of liens) {
        if (lien["@id"] === undefined) {
          continue
        }
        existingLienByHash.delete(
          objectHash({
            cible: lien["@sens"] === "cible",
            cidtexte: lien["@cidtexte"] ?? null,
            id: lien["@id"],
            typelien: lien["@typelien"],
          }),
        )
        await db`
          INSERT INTO texte_version_lien (
            texte_version_id,
            cible,
            cidtexte,
            id,
            typelien
          ) VALUES (
            ${id},
            ${lien["@sens"] === "cible"},
            ${lien["@cidtexte"] ?? null},
            ${lien["@id"]},
            ${lien["@typelien"]}
          )
          ON CONFLICT
          DO NOTHING
        `
      }

      for (const {
        cible,
        cidtexte,
        id: linkedId,
        typelien,
      } of existingLienByHash.values()) {
        await db`
          DELETE FROM texte_version_lien
          WHERE
            texte_version_id = ${id}
            AND cible = ${cible}
            AND cidtexte = ${cidtexte}
            AND id = ${linkedId}
            AND typelien = ${typelien}
        `
      }
    }
  }
}

sade("index_liens", true)
  .describe("Index links of LEGI articles and LEGI & JORF textes versions")
  .action(async () => {
    await indexLiens()
    process.exit(0)
  })
  .parse(process.argv)
