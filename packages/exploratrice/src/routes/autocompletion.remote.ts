import {
  auditEmptyToNull,
  auditOptions,
  auditTrimString,
  auditTuple,
  cleanAudit,
} from "@auditors/core"
import type { PendingQuery, Row } from "postgres"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb, tisseuseDb } from "$lib/server/databases/index.js"

import {
  possibleTypes,
  type PossibleType,
  type Suggestion,
  type SuggestionDb,
} from "./autocompletion.js"
import { documentUidRegex, dossierUidRegex } from "@tricoteuses/assemblee"

export const autocomplete = query(
  standardSchemaV1<[string, PossibleType | null]>(
    cleanAudit,
    auditTuple(
      [auditTrimString, auditEmptyToNull],
      [auditTrimString, auditEmptyToNull, auditOptions(possibleTypes)],
    ),
  ),
  async ([q, typeFilter]): Promise<Array<Suggestion>> => {
    const whereClauses: PendingQuery<Row[]>[] = []
    if (typeFilter !== null) {
      whereClauses.push(
        whereClauses.length === 0 ? tisseuseDb`WHERE` : tisseuseDb`AND`,
        tisseuseDb`${tisseuseDb("type")} = ${typeFilter}`,
      )
    }
    const whereClause = whereClauses.length === 0 ? tisseuseDb`` : whereClauses
    return (
      q === null
        ? await tisseuseDb<Array<SuggestionDb>>`
            SELECT
              autocompletion,
              badge,
              date,
              1 AS distance,
              id
            FROM titre_texte_autocompletion
            ${whereClause}
            ORDER BY id DESC
            LIMIT 10
          `
        : /^(JORF|LEGI)ARTI\d{12}$/.test(q)
          ? (
              await legiDb<
                Array<{
                  badge: string | null
                  // date: string | null
                  id: string
                  num: string | null
                  titre_court_texte: string | null
                  titre_texte: string | null
                }>
              >`
                SELECT
                  data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
                  id,
                  num,
                  data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' -> 0 ->> '@c_titre_court' AS titre_court_texte,
                  data -> 'CONTEXTE' -> 'TEXTE' -> 'TITRE_TXT' -> 0 ->> E'#text' AS titre_texte
                FROM article
                WHERE id = ${q}
              `
            ).map(
              ({
                badge,
                id,
                num,
                titre_court_texte,
                titre_texte,
              }): SuggestionDb => ({
                autocompletion: [
                  titre_texte ?? titre_court_texte,
                  num === null ? "article" : `article ${num}`,
                ]
                  .filter((fragment) => fragment != null)
                  .join(", "),
                badge,
                // TODO: Extract date from article,
                date: null,
                distance: 0,
                id,
              }),
            )
          : /^JORFCONT\d{12}$/.test(q)
            ? await legiDb<Array<SuggestionDb>>`
                SELECT
                  data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS autocompletion,
                  data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge
                  data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' AS date,
                  0 AS distance,
                  id
                FROM jo
                WHERE id = ${q}
              `
            : /^JORFDOLE\d{12}$/.test(q)
              ? await legiDb<Array<SuggestionDb>>`
                  SELECT
                    data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'TITRE' AS autocompletion,
                    data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
                    data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'DATE_DERNIERE_MODIFICATION' AS date,
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
                  ).map(
                    ({
                      id,
                      titre,
                      titre_court_texte,
                      titre_texte,
                    }): SuggestionDb => ({
                      autocompletion: [
                        titre_texte ?? titre_court_texte,
                        titre ?? "section sans titre",
                      ]
                        .filter((fragment) => fragment != null)
                        .join(", "),
                      badge: "SECTION",
                      // TODO: Extract date from SectionTa,
                      date: null,
                      distance: 0,
                      id,
                    }),
                  )
                : /^(JORF|LEGI)TEXT\d{12}$/.test(q)
                  ? await legiDb<Array<SuggestionDb>>`
                      SELECT
                        data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_VERSION' ->> 'TITREFULL' AS autocompletion,
                        data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
                        data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'DATE_TEXTE' as date,
                        0 AS distance,
                        id
                      FROM texte_version
                      WHERE id = ${q}
                    `
                  : documentUidRegex.test(q) || dossierUidRegex.test(q)
                    ? await tisseuseDb<Array<SuggestionDb>>`
                        SELECT
                          autocompletion,
                          badge,
                          date,
                          0 AS distance,
                          id
                        FROM titre_texte_autocompletion
                        WHERE id = ${q}
                        LIMIT 10
                      `
                    : await tisseuseDb<Array<SuggestionDb>>`
                        SELECT
                          autocompletion,
                          badge,
                          date,
                          autocompletion <-> ${q} AS distance,
                          id
                        FROM titre_texte_autocompletion
                        ${whereClause}
                        ORDER BY distance, autocompletion
                        LIMIT 10
                      `
    ).map((suggestion) => {
      if (suggestion.badge === null) {
        delete (
          suggestion as {
            badge?: string
          }
        ).badge
      }
      if (suggestion.date === null) {
        delete (
          suggestion as {
            date?: string
          }
        ).date
      }
      return suggestion as Suggestion
    })
  },
)
