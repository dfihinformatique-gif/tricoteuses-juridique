import assert from "assert"
import sade from "sade"

import type { JorfArticle } from "$lib/legal/jorf"
import type { LegiArticle, LegiArticleLienType } from "$lib/legal/legi"
import type { ArticleType, Sens } from "$lib/legal/shared"
import { db } from "$lib/server/databases"

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
})

async function calculateStatsOnArticleLinks({
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
    const countBySensByTypeLienByArticleType: Map<
      ArticleType | undefined,
      Map<LegiArticleLienType, Map<Sens, number>>
    > = new Map()
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
          const metaArticle = article.META.META_SPEC.META_ARTICLE
          let countBySensByTypeLien = countBySensByTypeLienByArticleType.get(
            metaArticle.TYPE,
          )
          if (countBySensByTypeLien === undefined) {
            countBySensByTypeLien = new Map()
            countBySensByTypeLienByArticleType.set(
              metaArticle.TYPE,
              countBySensByTypeLien,
            )
          }

          for (const lien of article.LIENS?.LIEN ?? []) {
            let countBySens = countBySensByTypeLien.get(lien["@typelien"])
            if (countBySens === undefined) {
              countBySens = new Map()
              countBySensByTypeLien.set(lien["@typelien"], countBySens)
            }

            countBySens.set(
              lien["@sens"],
              (countBySens.get(lien["@sens"]) ?? 0) + 1,
            )
          }
        }
      }
    }

    for (const [articleType, countBySensByTypeLien] of [
      ...countBySensByTypeLienByArticleType.entries(),
    ].sort()) {
      for (const [typeLien, countBySens] of [
        ...countBySensByTypeLien.entries(),
      ].sort()) {
        const cibleCount = countBySens.get("cible") ?? 0
        const sourceCount = countBySens.get("source") ?? 0
        console.log(
          `Nombre de ${typeLien} source / Nombre total de ${typeLien} dans le 1er article de consolidation d'un article JORF de type ${articleType} : ${sourceCount} / ${cibleCount + sourceCount} = ${percentFormatter.format(sourceCount / (cibleCount + sourceCount))}`,
        )
      }
      console.log()
    }
  }

  return 0
}

sade("article_links_stats", true)
  .describe("Check Article.VERSIONS.VERSION")
  .option("-s, --silent", "Hide log messages")
  .action(async (options) => {
    process.exit(await calculateStatsOnArticleLinks(options))
  })
  .parse(process.argv)
