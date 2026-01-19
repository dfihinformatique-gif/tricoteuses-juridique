import type { Suggestion, SuggestionDb } from "$lib/autocompletion.js"
import { suggestionFromSuggestionDb } from "$lib/autocompletion.js"
import { tisseuseDb } from "$lib/server/databases/index.js"

export interface QueryDossiersResult {
  dossiers: Suggestion[]
  total: number
}

export async function queryDossiers(
  limit: number,
  offset: number,
): Promise<QueryDossiersResult> {
  const today = new Date().toISOString().split("T")[0]

  const dossiers = (
    await tisseuseDb<Array<SuggestionDb>>`
      SELECT
        autocompletion,
        badge,
        date,
        0 AS distance,
        id
      FROM titre_texte_autocompletion
      WHERE
        type = 'Assemblée dossier'
        AND date <= ${today}
      ORDER BY date DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `
  ).map(suggestionFromSuggestionDb)

  const [{ count }] = await tisseuseDb<Array<{ count: number }>>`
    SELECT COUNT(*) as count
    FROM titre_texte_autocompletion
    WHERE
      type = 'Assemblée dossier'
      AND date <= ${today}
  `

  return {
    dossiers,
    total: count,
  }
}
