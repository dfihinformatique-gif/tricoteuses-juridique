import type { Suggestion, SuggestionDb } from "$lib/autocompletion.js"
import { suggestionFromSuggestionDb } from "$lib/autocompletion.js"
import { legiDb } from "$lib/server/databases/index.js"

export interface QueryJosResult {
  jos: Suggestion[]
  total: number
}

export async function queryJos(
  limit: number,
  offset: number,
): Promise<QueryJosResult> {
  const today = new Date().toISOString().split("T")[0]

  const jos = (
    await legiDb<Array<SuggestionDb>>`
      SELECT
        data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS autocompletion,
        data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
        data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' AS date,
        0 AS distance,
        id
      FROM jo
      WHERE data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' <= ${today}
      ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `
  ).map(suggestionFromSuggestionDb)

  const [{ count }] = await legiDb<Array<{ count: number }>>`
    SELECT COUNT(*) as count
    FROM jo
    WHERE data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' <= ${today}
  `

  return {
    jos,
    total: count,
  }
}
