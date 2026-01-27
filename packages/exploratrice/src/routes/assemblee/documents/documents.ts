import type { Suggestion, SuggestionDb } from "$lib/autocompletion.js"
import { suggestionFromSuggestionDb } from "$lib/autocompletion.js"
import { tisseuseDb } from "$lib/server/databases/index.js"

export interface QueryDocumentsResult {
  documents: Suggestion[]
  total: number
}

export async function queryDocuments(
  limit: number,
  offset: number,
): Promise<QueryDocumentsResult> {
  const today = new Date().toISOString().split("T")[0]

  const documents = (
    await tisseuseDb<Array<SuggestionDb>>`
      SELECT * FROM (
        SELECT DISTINCT ON (id)
          autocompletion,
          badge,
          date,
          0 AS distance,
          id
        FROM titre_texte_autocompletion
        WHERE
          type = 'Assemblée document'
          AND date <= ${today}
        ORDER BY id, date DESC NULLS LAST, autocompletion
      ) AS sub
      ORDER BY date DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `
  ).map(suggestionFromSuggestionDb)

  const [{ count }] = await tisseuseDb<Array<{ count: number }>>`
    SELECT COUNT(DISTINCT id) as count
    FROM titre_texte_autocompletion
    WHERE
      type = 'Assemblée document'
      AND date <= ${today}
  `

  return {
    documents,
    total: count,
  }
}
