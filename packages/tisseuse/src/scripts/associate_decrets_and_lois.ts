import metslesliens from "metslesliens"
import sade from "sade"

import type { JorfTexteVersion } from "$lib"
import { db } from "$lib/server/databases"

async function associateDecretsToLois(): Promise<void> {
  for (const texteVersion of (
    await db<{ data: JorfTexteVersion }[]>`
      SELECT data
      FROM texte_version
      WHERE
        data -> 'META' -> 'META_COMMUN' ->> 'NATURE' = 'DECRET'
        AND data -> 'META' -> 'META_COMMUN' ->> 'ORIGINE' = 'JORF'
    `
  ).map(({ data }) => data)) {
    const notice = texteVersion.NOTICE?.CONTENU
    if (notice === undefined) {
      continue
    }
    console.log(
      "\n################################################################################",
    )
    console.log(notice)
    console.log(
      "--------------------------------------------------------------------------------",
    )
    const links = metslesliens.getLinks(notice /* , metslesliens.getParser() */)
    console.log(JSON.stringify(links, null, 2))
  }
}

sade("associate_decrets_and_lois", true)
  .describe("Associate décrets with lois in database")
  .action(async () => {
    await associateDecretsToLois()
    process.exit(0)
  })
  .parse(process.argv)
