import sade from "sade"

import { legiDb, tisseuseDb } from "$lib/server/databases/index.js"

async function extractJosInfos({
  autocompletion: generateAutocompletions,
}: {
  autocompletion?: boolean
}): Promise<number> {
  if (generateAutocompletions) {
    const existingTitreTexteAutocompletionKeys = new Set(
      (
        await tisseuseDb<Array<{ autocompletion: string; id: string }>>`
          SELECT *
          FROM titre_texte_autocompletion
          WHERE id LIKE 'JORFCONT%'
        `
      ).map(({ autocompletion, id }) => JSON.stringify([id, autocompletion])),
    )
    for await (const joRows of legiDb<Array<{ id: string; titre: string }>>`
      SELECT
        id,
        data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS titre
      FROM jo
    `.cursor(100)) {
      for (const { id, titre } of joRows) {
        if (
          !existingTitreTexteAutocompletionKeys.delete(
            JSON.stringify([id, titre]),
          )
        ) {
          await tisseuseDb`
            INSERT INTO titre_texte_autocompletion (
              autocompletion,
              id
            ) VALUES (
              ${titre},
              ${id}
            )
          `
        }
      }
    }
    for (const obsoleteTitreTexteAutocompletionKey of existingTitreTexteAutocompletionKeys) {
      const [id, autocompletion] = JSON.parse(
        obsoleteTitreTexteAutocompletionKey,
      ) as [string, string]
      await tisseuseDb`
        DELETE FROM titre_texte_autocompletion
        WHERE
          id = ${id}
          AND autocompletion = ${autocompletion}
      `
    }
  }

  return 0
}

sade("extract_jos_infos", true)
  .describe(
    "Extract names of French Journaux officiels and convert them to JSON structures used for links, search, etc",
  )
  .option("-a, --autocompletion", "Generate autocompletions SQL table")
  .action(async (options) => {
    process.exit(await extractJosInfos(options))
  })
  .parse(process.argv)
