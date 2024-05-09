import {
  auditSetNullish,
  auditSingleton,
  auditStringToBoolean,
  auditTrimString,
  cleanAudit,
  type Audit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"

import type { Follow } from "$lib/aggregates"
import { auditFollowQuery } from "$lib/auditors/queries"
import type { JorfArticle, LegiArticle } from "$lib/legal"
import { Aggregator } from "$lib/server/aggregates"
import { db } from "$lib/server/databases"

import type { RequestHandler } from "./$types"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"

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
  for (const key of ["latest", "liens_entrants"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditSingleton(
        auditTrimString,
        auditStringToBoolean,
        auditSetNullish(false),
      ),
    )
  }

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const GET: RequestHandler = async ({ params, url }) => {
  let id = params.id
  const [query, queryError] = auditQuery(cleanAudit, url.searchParams) as [
    {
      follow: Set<Follow>
      latest: boolean
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
  const { follow, latest, liens_entrants } = query

  let article = (
    await db<{ data: JorfArticle | LegiArticle }[]>`
      SELECT data FROM article
      WHERE ID = ${id}
    `
  ).map(({ data }) => data)[0]
  if (article === undefined) {
    error(404, `ARTICLE ${id} non trouvé`)
  }
  if (latest) {
    const latestVersion = article.VERSIONS.VERSION.at(-1)
    const latestVersionId = latestVersion?.LIEN_ART["@id"]
    const isLatestVersion = article.META.META_COMMUN.ID === latestVersionId
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

  const aggregator = new Aggregator(follow)
  aggregator.addArticle(article)

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
