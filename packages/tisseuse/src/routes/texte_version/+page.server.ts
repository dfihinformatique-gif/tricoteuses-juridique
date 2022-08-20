import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"
import { error } from "@sveltejs/kit"

import { auditSearchQueryContent } from "$lib/auditors/queries"
import type { TexteVersion } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export function auditQuery(
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

  auditSearchQueryContent(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const load: PageServerLoad = async ({ url }) => {
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    { limit: number; offset: number; q?: string },
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
  const { limit, offset } = query

  const texteVersionArray = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    OFFSET ${offset}
    LIMIT ${limit}
  `
  ).map(({ data }) => data)
  return { texte_version: texteVersionArray }
}
