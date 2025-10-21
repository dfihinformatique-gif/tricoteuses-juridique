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
          SELECT autocompletion, id
          FROM titre_texte_autocompletion
          WHERE id LIKE 'JORFCONT%'
        `
      ).map(({ autocompletion, id }) => JSON.stringify([id, autocompletion])),
    )
    for await (const joRows of legiDb<
      Array<{ id: string; nature: string | null; titre: string }>
    >`
      SELECT
        id,
        data -> 'META' -> 'META_COMMUN' ->> 'NATURE' AS nature,
        data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS titre
      FROM jo
    `.cursor(100)) {
      for (const { id, nature, titre } of joRows) {
        await tisseuseDb`
          INSERT INTO titre_texte_autocompletion (
            autocompletion,
            badge,
            id
          ) VALUES (
            ${titre},
            ${nature ?? null},
            ${id}
          )
          ON CONFLICT (autocompletion, id) DO UPDATE SET
            badge = EXCLUDED.badge
          WHERE titre_texte_autocompletion.badge IS DISTINCT FROM EXCLUDED.badge
        `
        existingTitreTexteAutocompletionKeys.delete(JSON.stringify([id, titre]))
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
