import { error } from "@sveltejs/kit"
import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"

import type { Follow, GetTexteResult } from "$lib/aggregates.js"
import { auditFollowWithFalseQuery } from "$lib/auditors/queries.js"
import { urlFromUrlAndQuery } from "$lib/urls.js"

import type { PageLoad } from "./$types.js"

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

  auditFollowWithFalseQuery(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const load: PageLoad = async ({ fetch, url }) => {
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    {
      follow: Set<Follow | "false">
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
  const { follow: requestedFollow } = query

  let follow = new Set(requestedFollow)
  const followFalse = follow.delete("false")
  if (follow.size === 0 && !followFalse) {
    // Set default follow
    follow = new Set([
      // "STRUCT.LIEN_ART.@id",
      "STRUCT.LIEN_SECTION_TA.@id",
      // "STRUCTURE_TA.LIEN_ART.@id",
      "STRUCTURE_TA.LIEN_SECTION_TA.@id",
      "TEXTEKALI",
      "TEXTELR",
    ])
  }

  const apiUrl = urlFromUrlAndQuery(`/api${url.pathname}`, {
    follow,
    liens_entrants: true,
  })
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    const text = await response.text()
    console.error(
      `Error in ${url.pathname} while calling ${apiUrl}:\n${response.status} ${response.statusText}\n\n${text}`,
    )
    error(response.status, text)
  }
  return (await response.json()) as GetTexteResult
}
