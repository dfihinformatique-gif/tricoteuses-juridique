import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Follow } from "$lib/aggregates"
import {
  auditFollowSearchParams,
  auditQSearchParam,
} from "$lib/auditors/search_params"
import type { Article } from "$lib/legal"
import { type Aggregate, Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/database"

export function auditSearchParams(
  audit: Audit,
  query: URLSearchParams,
): [unknown, unknown] {
  if (query == null) {
    return [query, null]
  }
  if (!(query instanceof URLSearchParams)) {
    return audit.unexpectedType(query, "URLSearchParams")
  }

  const data: { [key: string]: unknown } = {}
  for (const [key, value] of query.entries()) {
    let values = data[key] as string[] | undefined
    if (values === undefined) {
      values = data[key] = []
    }
    values.push(value)
  }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  auditFollowSearchParams(audit, data, errors, remainingKeys)
  auditQSearchParam(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const doGetRecherche = async (
  url: URL,
): Promise<
  | (Aggregate & {
      q: string
    })
  | null
> => {
  const [query, queryError] = auditSearchParams(
    cleanAudit,
    url.searchParams,
  ) as [{ follow: Follow[]; q?: string }, unknown]
  if (queryError !== null) {
    console.error(
      `Error in ${url.pathname} query:\n${JSON.stringify(
        query,
        null,
        2,
      )}\n\nError:\n${JSON.stringify(queryError, null, 2)}`,
    )
    throw error(400, JSON.stringify(queryError, null, 2))
  }
  const { follow, q } = query

  if (q !== undefined) {
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1983-12-30/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1984-12-30/
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533/2018-01-01
    // https://www.legifrance.gouv.fr/loda/id/LEGIARTI000006317314/1983-12-30
    const articleId = q.match(/LEGIARTI\d+/)?.[0]
    if (articleId != null) {
      const article = (
        await db<{ data: Article }[]>`
          SELECT data FROM article
          WHERE id = ${articleId}
          LIMIT 1
        `
      ).map(({ data }) => data)[0]
      if (article !== undefined) {
        const aggregator = new Aggregator(follow)
        aggregator.addArticle(article)
        await aggregator.getAll()

        return { ...aggregator.toJson(), id: article.META.META_COMMUN.ID, q }
      }
    }
  }
  return null
}
