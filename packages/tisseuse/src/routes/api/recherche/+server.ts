import {
  auditSetNullish,
  auditSingleton,
  auditTrimString,
  auditStringToBoolean,
  cleanAudit,
  type Audit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Follow } from "$lib/aggregates"
import { auditFollowQuery, auditQQueryParameter } from "$lib/auditors/queries"
import type { JorfArticle, LegiArticle } from "$lib/legal"
import { Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/databases"

import type { RequestHandler } from "./$types"

function auditQuery(audit: Audit, query: URLSearchParams): [unknown, unknown] {
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

  auditFollowQuery(audit, data, errors, remainingKeys)
  auditQQueryParameter(audit, data, errors, remainingKeys)
  audit.attribute(
    data,
    "latest",
    true,
    errors,
    remainingKeys,
    auditSingleton(
      auditTrimString,
      auditStringToBoolean,
      auditSetNullish(false),
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const GET: RequestHandler = async ({ url }) => {
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    { follow: Set<Follow>; latest: boolean; q?: string },
    unknown,
  ]
  if (queryError !== null) {
    console.error(
      `Error in ${url.pathname} query:\n${JSON.stringify(
        query,
        null,
        2,
      )}\n\nError:\n${JSON.stringify(queryError, null, 2)}`,
    )
    error(400, JSON.stringify(queryError, null, 2))
  }
  const { follow, q, latest } = query

  const aggregator = new Aggregator(follow)
  let id: string | undefined = undefined
  if (q !== undefined) {
    // https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000048727355
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1983-12-30/
    // https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006308296/1984-12-30/
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533
    // https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000036456533/2018-01-01
    // https://www.legifrance.gouv.fr/loda/id/LEGIARTI000006317314/1983-12-30
    id = q.match(/(JORF|LEGI)ARTI\d{12}/)?.[0]
    if (id != null) {
      let article = (
        await db<{ data: JorfArticle | LegiArticle }[]>`
          SELECT data FROM article
          WHERE id = ${id}
        `
      ).map(({ data }) => data)[0]
      if (article !== undefined) {
        if (latest) {
          const latestVersion = article.VERSIONS.VERSION.at(-1)
          const latestVersionId = latestVersion?.LIEN_ART["@id"]
          const isLatestVersion =
            article.META.META_COMMUN.ID === latestVersionId
          if (!isLatestVersion && latestVersionId !== undefined) {
            const latestArticle = (
              await db<{ data: JorfArticle | LegiArticle }[]>`
                SELECT data FROM article
                WHERE ID = ${latestVersionId}
              `
            ).map(({ data }) => data)[0]
            if (latestArticle === undefined) {
              console.error(
                `Dernière version ${latestVersionId} de l'ARTICLE ${article.META.META_COMMUN.ID} non trouvée`,
              )
            } else {
              article = latestArticle
              id = latestVersionId
            }
          }
        }
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
