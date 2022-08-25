import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Follow } from "$lib/aggregates"
import {
  auditFollowSearchParams,
  auditLimitSearchParam,
  auditOffsetSearchParam,
  auditQSearchParam,
} from "$lib/auditors/search_params"
import type { TexteVersion } from "$lib/legal"
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
  auditLimitSearchParam(audit, data, errors, remainingKeys)
  auditOffsetSearchParam(audit, data, errors, remainingKeys)
  auditQSearchParam(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const GET: RequestHandler = async ({ url }) => {
  const [query, queryError] = auditSearchParams(
    cleanAudit,
    url.searchParams,
  ) as [
    {
      follow: Set<Follow>
      limit: number
      offset: number
      q?: string
    },
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
    throw error(400, JSON.stringify(queryError, null, 2))
  }
  const { follow, limit, offset, q } = query
  const texteVersionArray = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    OFFSET ${offset}
    LIMIT ${limit}
  `
  ).map(({ data }) => data)

  const aggregator = new Aggregator(follow)
  for (const texteVersion of texteVersionArray) {
    aggregator.addTexteVersion(texteVersion)
  }
  await aggregator.getAll()

  return new Response(
    JSON.stringify(
      {
        ...aggregator.toJson(),
        follow: [...follow],
        ids: texteVersionArray.map(
          (texteVersion) => texteVersion.META.META_COMMUN.ID,
        ),
        limit,
        offset,
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
