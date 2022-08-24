import { type Audit, auditSetNullish, cleanAudit } from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Aggregate, Follow } from "$lib/aggregates"
import {
  auditFollowSearchParams,
  auditLimitSearchParam,
  auditOffsetSearchParam,
  auditQSearchParam,
} from "$lib/auditors/search_params"
import type { TexteVersion } from "$lib/legal"
import { Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/database"

export function auditGetTexteSearchParams(
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

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditListTextesSearchParams(
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

export const doGetTexte = async (
  id: string,
  url: URL,
): Promise<
  Aggregate & {
    follow: Follow[]
  }
> => {
  const [query, queryError] = auditGetTexteSearchParams(
    cleanAudit,
    url.searchParams,
  ) as [
    {
      follow: Set<Follow>
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
  const { follow } = query
  const texteVersion = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    WHERE ID = ${id}
  `
  ).map(({ data }) => data)[0]
  if (texteVersion === undefined) {
    throw error(404, `TEXTE_VERSION ${id} non trouvé`)
  }

  const aggregator = new Aggregator(follow)
  aggregator.addTexteVersion(texteVersion)
  await aggregator.getAll()

  return {
    ...aggregator.toJson(),
    follow: [...follow],
    id,
  }
}

export const doListTextes = async (
  url: URL,
): Promise<
  Aggregate & {
    follow: Follow[]
    limit: number
    offset: number
    q?: string
  }
> => {
  const [query, queryError] = auditListTextesSearchParams(
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

  return {
    ...aggregator.toJson(),
    follow: [...follow],
    ids: texteVersionArray.map(
      (texteVersion) => texteVersion.META.META_COMMUN.ID,
    ),
    limit,
    offset,
    q,
  }
}
