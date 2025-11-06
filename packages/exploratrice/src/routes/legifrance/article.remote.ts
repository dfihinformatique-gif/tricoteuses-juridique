import {
  auditArray,
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  strictAudit,
} from "@auditors/core"
import {
  auditLegalId,
  type JorfArticle,
  type LegiArticle,
} from "@tricoteuses/legifrance"
import {
  extendLoadedArticle,
  getOrLoadArticleSiblingId,
  getOrLoadTextelr,
  loadArticles,
  newLegifranceObjectCache,
  type JorfArticleExtended,
  type LegifranceObjectCache,
  type LegiArticleExtended,
} from "@tricoteuses/tisseuse"
import type { JSONValue } from "postgres"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb } from "$lib/server/databases/index.js"

import type { ArticlePageInfos, ArticleWithLinks } from "./article.js"

const loadArticlesWithLinks = async (
  legifranceObjectCache: LegifranceObjectCache,
  ids: string[],
): Promise<{ [id: string]: ArticleWithLinks }> => {
  const articleWithLinksById = Object.fromEntries(
    (
      await legiDb<
        Array<{
          bloc_textuel: string | null
          data: JorfArticle | LegiArticle
          id: string
          nota: string | null
          num: string | null
        }>
      >`
      SELECT
        bloc_textuel,
        data,
        article.id AS id,
        nota,
        num
      FROM article
      LEFT JOIN article_contenu_avec_liens ON article.id = article_contenu_avec_liens.id
      WHERE article.id IN ${legiDb(ids)}
    `
    ).map(
      ({
        bloc_textuel: blocTextuel,
        data,
        id,
        nota,
        num,
      }): [string, ArticleWithLinks] => [
        id,
        Object.fromEntries(
          Object.entries({
            article: extendLoadedArticle({ data, num }),
            blocTextuel,
            nota,
          }).filter((_key, value) => value !== null),
        ) as {
          article: JorfArticleExtended | LegiArticleExtended
          blocTextuel?: string
          nota?: string
        },
      ],
    ),
  )

  let articleCache = legifranceObjectCache.get("ARTICLE")
  if (articleCache === undefined) {
    articleCache = new Map()
    legifranceObjectCache.set("ARTICLE", articleCache)
  }
  for (const [id, articleWithLinks] of Object.entries(articleWithLinksById)) {
    articleCache.set(
      id,
      (articleWithLinks?.article as unknown as JSONValue) ?? null,
    )
  }

  return articleWithLinksById
}

const loadArticleWithLinks = async (
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<ArticleWithLinks | undefined> => {
  const articleWithLinks = (
    await legiDb<
      Array<{
        bloc_textuel: string | null
        data: JorfArticle | LegiArticle
        nota: string | null
        num: string | null
      }>
    >`
      SELECT
        bloc_textuel,
        data,
        nota,
        num
      FROM article
      LEFT JOIN article_contenu_avec_liens ON article.id = article_contenu_avec_liens.id
      WHERE article.id = ${id}
    `
  ).map(
    ({ bloc_textuel: blocTextuel, data, nota, num }): ArticleWithLinks =>
      Object.fromEntries(
        Object.entries({
          article: extendLoadedArticle({ data, num }),
          blocTextuel,
          nota,
        }).filter((_key, value) => value !== null),
      ) as {
        article: JorfArticleExtended | LegiArticleExtended
        blocTextuel?: string
        nota?: string
      },
  )[0]
  let articleCache = legifranceObjectCache.get("ARTICLE")
  if (articleCache === undefined) {
    articleCache = new Map()
    legifranceObjectCache.set("ARTICLE", articleCache)
  }
  articleCache.set(
    id,
    (articleWithLinks?.article as unknown as JSONValue) ?? null,
  )
  return articleWithLinks
}

// export const queryArticle = query(
//   standardSchemaV1<string>(
//     strictAudit,
//     auditTrimString,
//     auditEmptyToNull,
//     auditLegalId,
//     auditRequire,
//   ),
//   async (id): Promise<JorfArticle | LegiArticle | undefined> =>
//     await getOrLoadArticle(legiDb, newLegifranceObjectCache(), id),
// )

// export const queryArticleContenuAvecLiens = query(
//   standardSchemaV1<string>(
//     strictAudit,
//     auditTrimString,
//     auditEmptyToNull,
//     auditLegalId,
//     auditRequire,
//   ),
//   async (id): Promise<{ blocTextuel?: string; nota?: string }> => {
//     const contenuAvecLiens = (
//       await legiDb<
//         Array<{
//           bloc_textuel: string | null
//           nota: string | null
//         }>
//       >`
//         SELECT
//           bloc_textuel,
//           nota
//         FROM article_contenu_avec_liens
//         WHERE id = ${id}
//       `
//     )[0]
//     return {
//       blocTextuel: contenuAvecLiens?.bloc_textuel ?? undefined,
//       nota: contenuAvecLiens?.nota ?? undefined,
//     }
//   },
// )

export const queryArticlePageInfos = query(
  standardSchemaV1<string>(
    strictAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<ArticlePageInfos | undefined> => {
    const legifranceObjectCache = newLegifranceObjectCache()
    const articleWithLinks = await loadArticleWithLinks(
      legifranceObjectCache,
      id,
    )
    if (articleWithLinks === undefined) {
      return undefined
    }
    const { article } = articleWithLinks
    const versionsArticlesIds = article.VERSIONS.VERSION.map(
      (version) => version.LIEN_ART["@id"],
    )
    const texteCid = article.CONTEXTE.TEXTE["@cid"]
    const textelr =
      texteCid === undefined
        ? undefined
        : await getOrLoadTextelr(legiDb, legifranceObjectCache, texteCid)
    const otherVersionsArticles = await loadArticles(
      legiDb,
      legifranceObjectCache,
      textelr === undefined
        ? legiDb`
            WHERE
              ${legiDb("id")} IN ${legiDb(versionsArticlesIds.filter((versionArticleId) => versionArticleId !== id))}
          `
        : legiDb`
            WHERE
              (
                ${legiDb("id")} IN ${legiDb(versionsArticlesIds)}
                OR (
                  data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' IN ${legiDb(
                    textelr.VERSIONS.VERSION.map(
                      (version) => version.LIEN_TXT["@id"],
                    ),
                  )}
                  AND num = ${article.num ?? null}
                )
              )
              AND id <> ${id}
          `,
    )
    return {
      ...articleWithLinks,
      nextArticleId: await getOrLoadArticleSiblingId(
        legiDb,
        legifranceObjectCache,
        id,
        1,
      ),
      otherVersionsArticles,
      previousArticleId: await getOrLoadArticleSiblingId(
        legiDb,
        legifranceObjectCache,
        id,
        -1,
      ),
    }
  },
)

export const queryArticlesWithLinks = query(
  standardSchemaV1<string[]>(
    strictAudit,
    auditArray(auditTrimString, auditEmptyToNull, auditLegalId, auditRequire),
    auditEmptyToNull,
    auditRequire,
  ),
  async (ids): Promise<{ [id: string]: ArticleWithLinks }> =>
    await loadArticlesWithLinks(newLegifranceObjectCache(), ids),
)

export const queryArticleWithLinks = query(
  standardSchemaV1<string>(
    strictAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<ArticleWithLinks | undefined> =>
    await loadArticleWithLinks(newLegifranceObjectCache(), id),
)
