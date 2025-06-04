import metslesliens from "metslesliens"
import type { JSONValue } from "postgres"
import sade from "sade"

import { db } from "$lib/server/databases/index.js"
import type { JorfArticle } from "$lib/legal/jorf.js"

async function importExtractedLinks(): Promise<number> {
  for await (const rows of db<Array<{ data: JorfArticle; id: string }>>`
    SELECT * FROM article
    WHERE id LIKE 'JORFARTI%'
  `.cursor(100)) {
    for (const { id, data: article } of rows) {
      const contenu = article.BLOC_TEXTUEL?.CONTENU
      if (contenu !== undefined) {
        const links = [...metslesliens.iterLinks(contenu)]
        if (links.length > 0) {
          await db`
            INSERT INTO article_liens_extraits (
              id,
              data
            ) VALUES (
              ${id},
              ${db.json(links as unknown as JSONValue)}
            )
            ON CONFLICT (id)
            DO UPDATE SET
              data = EXCLUDED.data
            WHERE article_liens_extraits.data IS DISTINCT FROM EXCLUDED.data
          `
          continue
        }
      }
      // Article has no link.
      await db`
        DELETE FROM article_liens_extraits
        WHERE id = ${id}
      `
    }
  }
  return 0
}

sade("import_extracted_links", true)
  .describe(
    "Extract links from HTML of texts & articles using metslesliens, and import them in database",
  )
  .action(async () => {
    process.exit(await importExtractedLinks())
  })
  .parse(process.argv)
