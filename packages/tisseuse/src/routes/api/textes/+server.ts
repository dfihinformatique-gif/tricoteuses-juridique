import {
  type Audit,
  auditSetNullish,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"
import type { PendingQuery, Row } from "postgres"

import type { Follow } from "$lib/aggregates"
import {
  auditFollowQuery,
  auditLimitQueryParameter,
  auditOffsetQueryParameter,
  auditQQueryParameter,
  auditSingleton,
} from "$lib/auditors/queries"
import type { TexteVersion } from "$lib/legal"
import { Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/database"
import { joinSqlClauses } from "$lib/server/sql"

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
  auditLimitQueryParameter(audit, data, errors, remainingKeys)
  audit.attribute(
    data,
    "nature",
    true,
    errors,
    remainingKeys,
    auditSingleton(auditTrimString),
  )
  auditOffsetQueryParameter(audit, data, errors, remainingKeys)
  auditQQueryParameter(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const GET: RequestHandler = async ({ url }) => {
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    {
      follow: Set<Follow>
      limit: number
      offset: number
      q?: string
      nature?: string
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
  const { follow, limit, nature, offset, q } = query

  const joinClauses: Array<PendingQuery<Row[]>> = []
  const orderByClauses: Array<PendingQuery<Row[]>> = []
  const selectClauses: Array<PendingQuery<Row[]>> = [db`data`]
  const whereClauses: Array<PendingQuery<Row[]>> = []

  if (nature !== undefined) {
    whereClauses.push(db`nature = ${nature}`)
  }
  if (q !== undefined) {
    joinClauses.push(db`
      CROSS JOIN (
        SELECT plainto_tsquery('french', ${q}) AS query
      ) AS constants
    `)
    orderByClauses.push(db`rank DESC`)
    selectClauses.push(db`ts_rank_cd(text_search, query) AS rank`)
    whereClauses.push(db`query @@ text_search`)
  }

  const joinClause = joinSqlClauses(db``, joinClauses)
  const orderByClause =
    orderByClauses.length > 0
      ? db`ORDER BY ${joinSqlClauses(db`,`, orderByClauses)}`
      : db``
  const selectClause = joinSqlClauses(db`,`, selectClauses)
  const whereClause =
    whereClauses.length > 0
      ? db`WHERE ${joinSqlClauses(db`AND`, whereClauses)}`
      : db``

  const texteVersionArray = (
    await db<{ data: TexteVersion }[]>`
      SELECT ${db`${selectClause}`} FROM texte_version
      ${db`${joinClause}`}
      ${db`${whereClause}`}
      ${db`${orderByClause}`}
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
        nature,
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
