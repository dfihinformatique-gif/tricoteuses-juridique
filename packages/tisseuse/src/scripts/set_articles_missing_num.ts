/**
 * TODO: Migrate to @tricoteuses/legifrance
 */

import {
  JorfArticle,
  LegiArticle,
  walkContexteTexteTm,
} from "@tricoteuses/legifrance"
import sade from "sade"

import { newLegifranceObjectCache } from "$lib/cache.js"
import {
  getOrLoadSectionsTa,
  getOrLoadTextelr,
} from "$lib/loaders/legifrance.js"
import { legiDb } from "$lib/server/databases/index.js"

export async function getArticleNum(
  article: JorfArticle | LegiArticle,
): Promise<string | undefined> {
  const legifranceObjectCache = newLegifranceObjectCache()
  const articleContexteTexte = article.CONTEXTE.TEXTE
  const articleId = article.META.META_COMMUN.ID
  let articleNum = article.META.META_SPEC.META_ARTICLE.NUM
  if (articleNum === undefined) {
    const texteCid = articleContexteTexte["@cid"]
    const textelr =
      texteCid === undefined
        ? undefined
        : await getOrLoadTextelr(legiDb, legifranceObjectCache, texteCid)
    if (articleContexteTexte.TM === undefined) {
      const lienArticle = textelr?.STRUCT?.LIEN_ART?.find(
        (lienArticle) => lienArticle["@id"] === articleId,
      )
      if (lienArticle !== undefined && lienArticle["@num"] !== undefined) {
        articleNum = lienArticle["@num"]
      }
    } else {
      const articleLastTm = [
        ...walkContexteTexteTm(articleContexteTexte.TM),
      ].at(-1)!
      const sectionsTaIds = Array.isArray(articleLastTm.TITRE_TM)
        ? articleLastTm.TITRE_TM.map((titreTm) => titreTm["@id"])
        : [articleLastTm.TITRE_TM["@id"]]
      const sectionsTa = await getOrLoadSectionsTa(
        legiDb,
        legifranceObjectCache,
        sectionsTaIds,
      )
      const articlesNums = new Set(
        sectionsTa
          .map(
            (sectionTa) =>
              sectionTa.STRUCTURE_TA?.LIEN_ART?.find(
                (lienArticle) => lienArticle["@id"] === articleId,
              )?.["@num"],
          )
          .filter((num) => num !== undefined),
      )
      if (articlesNums.size !== 0) {
        if (articlesNums.size !== 1) {
          console.warn(
            `Article ${article.META.META_COMMUN.ID} has several NUM values, given by its parent sections TA`,
          )
        }
        articleNum = articlesNums.values().next().value
      }
    }
  }
  return articleNum
}

async function setArticlesMissingNum(): Promise<number> {
  for await (const articleRows of legiDb<
    Array<{ data: JorfArticle | LegiArticle; id: string }>
  >`
    SELECT data, id
    FROM article
    WHERE data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' IS NULL
  `.cursor(100)) {
    for (const { data: article, id } of articleRows) {
      const num = await getArticleNum(article)
      if (num !== undefined) {
        await legiDb`
          UPDATE article
          SET num = ${num}
          WHERE id = ${id}
        `
      }
    }
  }

  return 0
}

sade("set_articles_missing_num", true)
  .describe(
    "Set missing num of articles with the ones present in LIEN_ARTICLE of parent sections",
  )
  .action(async () => {
    process.exit(await setArticlesMissingNum())
  })
  .parse(process.argv)
