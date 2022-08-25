import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Follow } from "$lib/aggregates"
import {
  auditFollowSearchParams,
  auditQSearchParam,
} from "$lib/auditors/search_params"
import type { Article } from "$lib/legal"
import { Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/database"

import type { RequestHandler } from "./$types"

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

export const GET: RequestHandler = async ({ url }) => {
  const [query, queryError] = auditSearchParams(
    cleanAudit,
    url.searchParams,
  ) as [{ follow: Set<Follow>; q?: string }, unknown]
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

  const aggregator = new Aggregator(follow)
  let id: string | undefined = undefined
  if (q !== undefined) {
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1983-12-30/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1984-12-30/
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533/2018-01-01
    // https://www.legifrance.gouv.fr/loda/id/LEGIARTI000006317314/1983-12-30
    id = q.match(/LEGIARTI\d+/)?.[0]
    if (id != null) {
      const article = (
        await db<{ data: Article }[]>`
          SELECT data FROM article
          WHERE id = ${id}
        `
      ).map(({ data }) => data)[0]
      if (article !== undefined) {
        aggregator.addArticle(article)
      }
    }
  }
  await aggregator.getAll()

  return new Response(
    JSON.stringify(
      {
        ...aggregator.toJson(),
        follow: [...follow],
        id,
        q,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  )
}
