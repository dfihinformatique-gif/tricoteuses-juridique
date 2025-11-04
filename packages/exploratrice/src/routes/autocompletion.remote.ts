import {
  auditEmptyToNull,
  auditOptions,
  auditTrimString,
  auditTuple,
  cleanAudit,
} from "@auditors/core"
import { documentUidRegex, dossierUidRegex } from "@tricoteuses/assemblee"
import {
  iterReferenceLinks,
  listeReferencesSeules,
  reference,
  simplifyPlainText,
  TextParserContext,
  type TextAstReference,
} from "@tricoteuses/tisseuse"
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

export const autocomplete = query(
  standardSchemaV1<[string, PossibleType | null]>(
    cleanAudit,
    auditTuple(
      [auditTrimString, auditEmptyToNull],
      [auditTrimString, auditEmptyToNull, auditOptions(possibleTypes)],
    ),
  ),
  async ([q, typeFilter]): Promise<Array<Suggestion>> => {
    if (q !== null) {
      const context = new TextParserContext(simplifyPlainText(q).output)
      let referenceAstArray = listeReferencesSeules(context) as
        | TextAstReference[]
        | undefined
      if (referenceAstArray === undefined) {
        const referenceAst = reference(context) as TextAstReference | undefined
        if (referenceAst !== undefined) {
          referenceAstArray = [referenceAst]
        }
      }
      console.log("referenceAstArray", referenceAstArray)
      if (referenceAstArray !== undefined) {
        const encounteredIds = new Set<string>()
        const suggestionsDb: SuggestionDb[] = []
        for (const referenceAst of referenceAstArray) {
          for await (const link of iterReferenceLinks({
            context,
            date: new Date().toISOString().split("T")[0],
            reference: referenceAst,
            legiDb,
          })) {
            switch (link.type) {
              case "external_article": {
                if (
                  link.articleId !== undefined &&
                  !encounteredIds.has(link.articleId)
                ) {
                  encounteredIds.add(link.articleId)
                  suggestionsDb.push(
                    ...(await suggestionDbArrayFromLegifranceArticleId(
                      link.articleId,
                    )),
                  )
                }
                break
              }

              case "external_division": {
                if (
                  link.sectionTaId !== undefined &&
                  !encounteredIds.has(link.sectionTaId)
                ) {
                  encounteredIds.add(link.sectionTaId)
                  suggestionsDb.push(
                    ...(await suggestionDbArrayFromLegifranceSectionTaId(
                      link.sectionTaId,
                    )),
                  )
                }
                break
              }

              case "external_text": {
                // TODO: Use the latest ID of text instead of its CID
                if (
                  link.text.cid !== undefined &&
                  !encounteredIds.has(link.text.cid)
                ) {
                  encounteredIds.add(link.text.cid)
                  suggestionsDb.push(
                    ...(await suggestionDbArrayFromLegifranceTexteId(
                      link.text.cid,
                    )),
                  )
                }
                break
              }

              // case "article_definition":
              // case "internal_article":
              default: {
                throw new Error(`Unexpected link of type "${link.type}"`)
              }
            }
          }
        }
        if (suggestionsDb.length !== 0) {
          return suggestionsDb.map(suggestionFromSuggestionDb)
        }
      }
    }

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
          ? await suggestionDbArrayFromLegifranceArticleId(q)
          : /^JORFCONT\d{12}$/.test(q)
            ? await suggestionDbArrayFromLegifranceJoId(q)
            : /^JORFDOLE\d{12}$/.test(q)
              ? await suggestionDbArrayFromLegifranceDossierLegislatifId(q)
              : /^(JORF|LEGI)SCTA\d{12}$/.test(q)
                ? await suggestionDbArrayFromLegifranceSectionTaId(q)
                : /^(JORF|LEGI)TEXT\d{12}$/.test(q)
                  ? await suggestionDbArrayFromLegifranceTexteId(q)
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
    ).map(suggestionFromSuggestionDb)
  },
)

const suggestionDbArrayFromLegifranceArticleId = async (
  id: string,
): Promise<SuggestionDb[]> =>
  (
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
      WHERE id = ${id}
    `
  ).map(
    ({ badge, id, num, titre_court_texte, titre_texte }): SuggestionDb => ({
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

const suggestionDbArrayFromLegifranceDossierLegislatifId = async (
  id: string,
): Promise<SuggestionDb[]> =>
  await legiDb<Array<SuggestionDb>>`
    SELECT
      data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'TITRE' AS autocompletion,
      data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
      data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'DATE_DERNIERE_MODIFICATION' AS date,
      0 AS distance,
      id
    FROM dole
    WHERE id = ${id}
  `

const suggestionDbArrayFromLegifranceJoId = async (
  id: string,
): Promise<SuggestionDb[]> =>
  await legiDb<Array<SuggestionDb>>`
    SELECT
      data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS autocompletion,
      data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge
      data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' AS date,
      0 AS distance,
      id
    FROM jo
    WHERE id = ${id}
  `

const suggestionDbArrayFromLegifranceSectionTaId = async (
  id: string,
): Promise<SuggestionDb[]> =>
  (
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
        WHERE id = ${id}
      `
  ).map(
    ({ id, titre, titre_court_texte, titre_texte }): SuggestionDb => ({
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

const suggestionDbArrayFromLegifranceTexteId = async (
  id: string,
): Promise<SuggestionDb[]> =>
  await legiDb<Array<SuggestionDb>>`
    SELECT
      data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_VERSION' ->> 'TITREFULL' AS autocompletion,
      data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
      data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'DATE_TEXTE' as date,
      0 AS distance,
      id
    FROM texte_version
    WHERE id = ${id}
  `

const suggestionFromSuggestionDb = (suggestion: SuggestionDb): Suggestion => {
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
}
