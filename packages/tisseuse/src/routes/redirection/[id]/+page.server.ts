import {
  auditEmptyToNull,
  auditRequire,
  auditSetNullish,
  cleanAudit,
  type Audit,
} from "@auditors/core"
import { error, redirect } from "@sveltejs/kit"

import { assertNever } from "$lib/asserts.js"
import { auditQueryOptionsArray } from "$lib/auditors/queries.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import type { JorfTexteNature, JorfTexteVersion } from "$lib/legal/jorf.js"
import type { LegiTexteNature, LegiTexteVersion } from "$lib/legal/legi.js"
import config from "$lib/server/config.js"
import { db } from "$lib/server/databases/index.js"
import {
  organizationNameByTexteNature,
  repositoryNameFromTitle,
} from "$lib/urls.js"

import type { PageLoad } from "./$types.js"

type TargetType = (typeof targetsTypes)[number]

const { forgejo } = config
const targetsTypes = [
  "git", // TODO: Rename to something like "consolidation"
  "json",
  "legifrance",
  "markdown",
  "tricoteuses",
] as const

const auditRedirectionQuery = (
  audit: Audit,
  query: URLSearchParams,
): [unknown, unknown] => {
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

  audit.attribute(
    data,
    "vers",
    true,
    errors,
    remainingKeys,
    auditQueryOptionsArray(targetsTypes),
    auditEmptyToNull,
    auditSetNullish(["markdown"]),
  )

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export const load: PageLoad = async ({ params, url }) => {
  const [query, queryError] = auditRedirectionQuery(
    cleanAudit,
    url.searchParams,
  ) as [{ vers: TargetType[] }, Record<string, unknown> | null]
  if (queryError !== null) {
    console.error(
      `Error in ${url.pathname} query:\n${JSON.stringify(
        query,
        null,
        2,
      )}\n\nError:\n${JSON.stringify(queryError, null, 2)}`,
    )
    error(
      400,
      Object.entries(queryError)
        .map(([key, message]) => `${key}: ${JSON.stringify(message)}`)
        .join(", "),
    )
  }

  for (const targetType of query.vers) {
    switch (targetType) {
      case "git": {
        if (forgejo !== undefined) {
          if (/^(JORF|LEGI)ARTI\d{12}$/.test(params.id)) {
            const entry = (
              await db<
                {
                  data: JorfTexteVersion | LegiTexteVersion
                  date: string
                  id: string
                  nature: JorfTexteNature | LegiTexteNature
                  path: string
                }[]
              >`
                SELECT texte_version.data, article_git.date, texte_version.nature, article_git.path
                FROM article_git
                INNER JOIN article ON article_git.id = article.id
                INNER JOIN texte_version ON article.data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = texte_version.id
                WHERE article_git.id = ${params.id}
              `
            )[0]
            if (entry !== undefined) {
              const { data: texteVersion, date, nature, path } = entry
              const organizationName =
                organizationNameByTexteNature[nature as LegiTexteNature]
              const texteTitle =
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
                texteVersion.META.META_COMMUN.ID
              const repositoryName = repositoryNameFromTitle(texteTitle)
              if (organizationName !== undefined) {
                redirect(
                  303,
                  new URL(
                    `${organizationName}/${repositoryName}/src/tag/${date}/${path}`,
                    forgejo.url,
                  ),
                )
              }
            }
          }

          if (/^(JORF|LEGI)SCTA\d{12}$/.test(params.id)) {
            const entry = (
              await db<
                {
                  data: JorfTexteVersion | LegiTexteVersion
                  date: string
                  id: string
                  nature: JorfTexteNature | LegiTexteNature
                  path: string
                }[]
              >`
            SELECT texte_version.data, section_ta_git.date, texte_version.nature, section_ta_git.path
            FROM section_ta_git
            INNER JOIN section_ta ON section_ta_git.id = section_ta.id
            INNER JOIN texte_version ON section_ta.data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = texte_version.id
            WHERE section_ta_git.id = ${params.id}
          `
            )[0]
            if (entry !== undefined) {
              const { data: texteVersion, date, nature, path } = entry
              const organizationName =
                organizationNameByTexteNature[nature as LegiTexteNature]
              const texteTitle =
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
                texteVersion.META.META_COMMUN.ID
              const repositoryName = repositoryNameFromTitle(texteTitle)
              if (organizationName !== undefined) {
                redirect(
                  303,
                  new URL(
                    `${organizationName}/${repositoryName}/src/tag/${date}/${path}`,
                    forgejo.url,
                  ),
                )
              }
            }
          }

          if (/^(JORF|LEGI)TEXT\d{12}$/.test(params.id)) {
            const entry = (
              await db<
                {
                  data: JorfTexteVersion | LegiTexteVersion
                  date: string
                  id: string
                  nature: JorfTexteNature | LegiTexteNature
                  path: string
                }[]
              >`
                SELECT texte_version.data, texte_version_git.date, texte_version.nature, texte_version_git.path
                FROM texte_version_git
                INNER JOIN texte_version ON texte_version_git.id = texte_version.id
                WHERE texte_version_git.id = ${params.id}
              `
            )[0]
            if (entry !== undefined) {
              const { data: texteVersion, date, nature, path } = entry
              const organizationName =
                organizationNameByTexteNature[nature as LegiTexteNature]
              const texteTitle =
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
                texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
                texteVersion.META.META_COMMUN.ID
              const repositoryName = repositoryNameFromTitle(texteTitle)
              if (organizationName !== undefined) {
                redirect(
                  303,
                  new URL(
                    `${organizationName}/${repositoryName}/src/tag/${date}/${path}`,
                    forgejo.url,
                  ),
                )
              }
            }
          }
        }

        continue
      }

      case "json": {
        if (forgejo !== undefined) {
          redirect(
            303,
            new URL(
              `dila/textes_juridiques/src/branch/main/${gitPathFromId(params.id, ".json")}`,
              forgejo.url,
            ),
          )
        }

        continue
      }

      case "legifrance": {
        if (/^(JORF|LEGI)ARTI\d{12}$/.test(params.id)) {
          const entry = (
            await db<
              {
                nature: JorfTexteNature | LegiTexteNature
              }[]
            >`
              SELECT texte_version.nature
              FROM article
              INNER JOIN texte_version ON article.data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = texte_version.id
              WHERE article.id = ${params.id}
            `
          )[0]
          if (entry !== undefined) {
            const { nature } = entry
            if (nature === "CODE") {
              // Show article alone.
              redirect(
                303,
                `https://www.legifrance.gouv.fr/codes/article_lc/${params.id}`,
              )
            }
          }
          // Show article inside full text.
          // redirect(303, `https://www.legifrance.gouv.fr/loda/id/${params.id}/`)
          // Show article alone.
          redirect(
            303,
            `https://www.legifrance.gouv.fr/loda/article_lc/${params.id}/`,
          )
        }

        if (/^(JORF|LEGI)SCTA\d{12}$/.test(params.id)) {
          const entry = (
            await db<
              {
                data: JorfTexteVersion | LegiTexteVersion
                nature: JorfTexteNature | LegiTexteNature
              }[]
            >`
          SELECT texte_version.data, texte_version.nature
          FROM section_ta
          INNER JOIN texte_version ON section_ta.data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = texte_version.id
          WHERE section_ta.id = ${params.id}
        `
          )[0]
          if (entry !== undefined) {
            const { data: texteVersion, nature } = entry
            if (nature === "CODE") {
              redirect(
                303,
                `https://www.legifrance.gouv.fr/codes/section_lc/${texteVersion.META.META_COMMUN.ID}/${params.id}/`,
              )
            }
          }
          redirect(303, `https://www.legifrance.gouv.fr/loda/id/${params.id}/`)
        }

        if (/^(JORF|LEGI)TEXT\d{12}$/.test(params.id)) {
          const texteVersion = (
            await db<
              {
                data: JorfTexteVersion | LegiTexteVersion
              }[]
            >`
              SELECT data
              FROM texte_version
              WHERE id = ${params.id}
            `
          )[0]?.data
          if (texteVersion !== undefined) {
            const nature = texteVersion.META.META_COMMUN.NATURE
            if (nature === "CODE") {
              redirect(
                303,
                `https://www.legifrance.gouv.fr/codes/texte_lc/${params.id}`,
              )
            }
          }
          redirect(303, `https://www.legifrance.gouv.fr/loda/id/${params.id}/`)
        }

        continue
      }

      case "markdown": {
        if (forgejo !== undefined) {
          redirect(
            303,
            new URL(
              `dila/textes_juridiques/src/branch/main/${gitPathFromId(params.id, ".md")}`,
              forgejo.url,
            ),
          )
        }

        continue
      }

      case "tricoteuses": {
        if (/^(JORF|LEGI)ARTI\d{12}$/.test(params.id)) {
          const exists = (
            await db<
              {
                exists: boolean
              }[]
            >`
              SELECT exists(
                SELECT 1
                FROM article
                WHERE id= ${params.id}
              ) AS "exists"
            `
          )[0]?.exists
          if (exists) {
            redirect(303, `/article/${params.id}`)
          }
        }

        if (/^(JORF|LEGI)SCTA\d{12}$/.test(params.id)) {
          const exists = (
            await db<
              {
                exists: boolean
              }[]
            >`
              SELECT exists(
                SELECT 1
                FROM section_ta
                WHERE id= ${params.id}
              ) AS "exists"
            `
          )[0]?.exists
          if (exists) {
            redirect(303, `/section_ta/${params.id}`)
          }
        }

        if (/^(JORF|LEGI)TEXT\d{12}$/.test(params.id)) {
          const exists = (
            await db<
              {
                exists: boolean
              }[]
            >`
              SELECT exists(
                SELECT 1
                FROM texte_version
                WHERE id= ${params.id}
              ) AS "exists"
            `
          )[0]?.exists
          if (exists) {
            redirect(303, `/texte_version/${params.id}`)
          }
        }

        continue
      }

      default:
        assertNever("TargetType", targetType)
    }
  }

  error(404, `Identifiant Légifrance "${params.id}" non trouvé`)
}
