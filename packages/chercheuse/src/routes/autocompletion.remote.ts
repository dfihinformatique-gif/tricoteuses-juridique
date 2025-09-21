import { query } from "$app/server"
import { tisseuseDb } from "$lib/server/databases/index.js"

export const autocomplete = query(
  "unchecked",
  async (
    q: string,
  ): Promise<
    Array<{
      autocompletion: string
      distance: number
      id: string
    }>
  > => {
    const autocompletions = await tisseuseDb<
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
	`
    return autocompletions
  },
)
