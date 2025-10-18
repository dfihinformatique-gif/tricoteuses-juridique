import { auditEmptyToNull, auditTrimString, cleanAudit } from "@auditors/core"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb, tisseuseDb } from "$lib/server/databases/index.js"

export const autocomplete = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString, auditEmptyToNull),
  async (
    q,
  ): Promise<
    Array<{
      autocompletion: string
      distance: number
      id: string
    }>
  > =>
    q === null
      ? await tisseuseDb<
          Array<{
            autocompletion: string
            distance: number
            id: string
          }>
        >`
          SELECT
            autocompletion,
            1 AS distance,
            id
          FROM titre_texte_autocompletion
          ORDER BY id DESC
          LIMIT 10
        `
      : /^(JORF|LEGI)ARTI\d{12}$/.test(q)
        ? (
            await legiDb<
              Array<{
                id: string
                num: string | null
                titre_court_texte: string | null
                titre_texte: string | null
              }>
            >`
              SELECT
                id,
                num,
                data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' -> 0 ->> '@c_titre_court' AS titre_court_texte,
                data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' -> 0 ->> E'#text' AS titre_texte
              FROM article
              WHERE id = ${q}
            `
          ).map(({ id, num, titre_court_texte, titre_texte }) => ({
            autocompletion: [
              titre_texte ?? titre_court_texte,
              num === null ? "article" : `article ${num}`,
            ]
              .filter((fragment) => fragment != null)
              .join(", "),
            distance: 0,
            id,
          }))
        : /^JORFCONT\d{12}$/.test(q)
          ? await legiDb<
              Array<{
                autocompletion: string
                distance: number
                id: string
              }>
            >`
              SELECT
                data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS autocompletion,
                0 AS distance,
                id
              FROM jo
              WHERE id = ${q}
            `
          : /^JORFDOLE\d{12}$/.test(q)
            ? await legiDb<
                Array<{
                  autocompletion: string
                  distance: number
                  id: string
                }>
              >`
                SELECT
                  data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'TITRE' AS autocompletion,
                  0 AS distance,
                  id
                FROM dole
                WHERE id = ${q}
              `
            : /^(JORF|LEGI)SCTA\d{12}$/.test(q)
              ? (
                  await legiDb<
                    Array<{
                      id: string
                      titre: string | null
                      titre_court_texte: string | null
                      titre_texte: string | null
                    }>
                  >`
                    SELECT
                      id,
                      data ->> 'TITRE_TA' AS titre,
                      data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' ->> '@c_titre_court' AS titre_court_texte,
                      data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' ->> '#text' AS titre_texte
                    FROM section_ta
                    WHERE id = ${q}
                  `
                ).map(({ id, titre, titre_court_texte, titre_texte }) => ({
                  autocompletion: [
                    titre_texte ?? titre_court_texte,
                    titre ?? "section sans titre",
                  ]
                    .filter((fragment) => fragment != null)
                    .join(", "),
                  distance: 0,
                  id,
                }))
              : /^(JORF|LEGI)TEXT\d{12}$/.test(q)
                ? await legiDb<
                    Array<{
                      autocompletion: string
                      distance: number
                      id: string
                    }>
                  >`
                    SELECT
                      data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_VERSION' ->> 'TITREFULL' AS autocompletion,
                      0 AS distance,
                      id
                    FROM texte_version
                    WHERE id = ${q}
                  `
                : await tisseuseDb<
                    Array<{
                      autocompletion: string
                      distance: number
                      id: string
                    }>
                  >`
                    SELECT
                      autocompletion,
                      autocompletion <-> ${q} AS distance,
                      id
                    FROM titre_texte_autocompletion
                    ORDER BY distance, autocompletion
                    LIMIT 10
                  `,
)
