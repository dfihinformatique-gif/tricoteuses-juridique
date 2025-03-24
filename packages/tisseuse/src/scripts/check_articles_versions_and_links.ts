import assert from "assert"
import sade from "sade"

import type { JorfArticle } from "$lib/legal/jorf"
import type { LegiArticle } from "$lib/legal/legi"
import { db } from "$lib/server/databases"

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
})

async function checkArticlesVersions({
  silent,
}: {
  silent?: boolean
} = {}): Promise<number> {
  // Vérifie qu'un article JORF est toujours en dernier dans la liste des versions
  // => S'il a une version avant lui c'est une version LEGI (et on suppose que
  // c'est sa consolidation ?).
  for await (const articleRows of db<Array<{ data: JorfArticle; id: string }>>`
    SELECT * FROM article
    WHERE id LIKE 'JORF%'
  `.cursor(100)) {
    for (const { data: article, id } of articleRows) {
      const versions = article.VERSIONS.VERSION
      assert.strictEqual(versions.at(-1)?.LIEN_ART["@id"], id, id)
    }
  }

  {
    let modifieCount = 0
    let modifieSourceCount = 0
    for await (const articleRows of db<
      Array<{ data: LegiArticle; id: string }>
    >`
      SELECT * FROM article
      WHERE id LIKE 'LEGI%'
    `.cursor(100)) {
      for (const { data: article, id } of articleRows) {
        const versions = article.VERSIONS.VERSION
        if (
          versions.length > 1 &&
          versions.at(-2)?.LIEN_ART["@id"] === id &&
          versions.at(-1)?.LIEN_ART["@id"].startsWith("JORF")
        ) {
          for (const lien of article.LIENS?.LIEN ?? []) {
            if (lien["@typelien"] === "MODIFIE") {
              modifieCount++
              if (lien["@sens"] === "source") {
                modifieSourceCount++
              }
            }
          }
        }
      }
    }
    console.log(
      `Nombre de MODIFIE source dans le 1er article de consolidation d'un article JORF: ${modifieSourceCount} / ${modifieCount} = ${percentFormatter.format(modifieSourceCount / modifieCount)}`,
    )
  }

  {
    let modifieCount = 0
    let modifieSourceCount = 0
    for await (const articleRows of db<
      Array<{ data: LegiArticle; id: string }>
    >`
      SELECT * FROM article
      WHERE id LIKE 'LEGI%'
      AND data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'TYPE' = 'AUTONOME'
    `.cursor(100)) {
      for (const { data: article, id } of articleRows) {
        const versions = article.VERSIONS.VERSION
        if (
          versions.length > 1 &&
          versions.at(-2)?.LIEN_ART["@id"] === id &&
          versions.at(-1)?.LIEN_ART["@id"].startsWith("JORF")
        ) {
          for (const lien of article.LIENS?.LIEN ?? []) {
            if (lien["@typelien"] === "MODIFIE") {
              modifieCount++
              if (lien["@sens"] === "source") {
                modifieSourceCount++
              }
            }
          }
        }
      }
    }
    console.log(
      `Nombre de MODIFIE source dans le 1er article de consolidation d'un article JORF autonome': ${modifieSourceCount} / ${modifieCount} = ${percentFormatter.format(modifieSourceCount / modifieCount)}`,
    )
  }

  return 0
}

sade("check_articles_versions", true)
  .describe("Check Article.VERSIONS.VERSION")
  .option("-s, --silent", "Hide log messages")
  .action(async (options) => {
    process.exit(await checkArticlesVersions(options))
  })
  .parse(process.argv)
