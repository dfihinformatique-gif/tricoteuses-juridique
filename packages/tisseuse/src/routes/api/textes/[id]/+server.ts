import {
  type Audit,
  auditSetNullish,
  cleanAudit,
  auditSingleton,
  auditTrimString,
  auditStringToBoolean,
} from "@auditors/core"
import { error } from "@sveltejs/kit"

import { auditFollowQuery } from "$lib/auditors/queries.js"

import type { Follow } from "$lib/aggregates.js"
import type { TexteVersion } from "$lib/legal/index.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"
import { Aggregator } from "$lib/server/aggregates.js"
import { db } from "$lib/server/databases/index.js"

import type { RequestHandler } from "./$types.js"

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
  audit.attribute(
    data,
    "liens_entrants",
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

export const GET: RequestHandler = async ({ params, url }) => {
  const id = params.id
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    {
      follow: Set<Follow>
      liens_entrants: boolean
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
    error(400, JSON.stringify(queryError, null, 2))
  }
  const { follow, liens_entrants } = query
  const texteVersion = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    WHERE ID = ${id}
  `
  ).map(({ data }) => data)[0]
  if (texteVersion === undefined) {
    error(404, `TEXTE_VERSION ${id} non trouvé`)
  }

  const aggregator = new Aggregator(follow)
  aggregator.addTexteVersion(texteVersion)

  if (liens_entrants) {
    for (const lien of await db<ArticleLienDb[]>`
      SELECT *
      FROM article_lien
      WHERE id = ${id}
    `) {
      aggregator.addArticleLienDb(lien)
    }
    for (const lien of await db<TexteVersionLienDb[]>`
        SELECT *
        FROM texte_version_lien
        WHERE id = ${id}
      `) {
      aggregator.addTexteVersionLienDb(lien)
    }
  }

  await aggregator.getAll()

  return new Response(
    JSON.stringify(
      {
        ...aggregator.toJson(),
        follow: [...follow],
        id,
        liens_entrants,
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
