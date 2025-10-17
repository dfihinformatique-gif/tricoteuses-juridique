import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import {
  auditLegalId,
  type JorfArticle,
  type LegiArticle,
} from "@tricoteuses/legifrance"
import {
  // getOrLoadArticle,
  getSiblingArticleId,
  newLegalObjectCacheByIdByCategorieTag,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import type { ArticlePageInfos, ArticleWithLinks } from "$lib/articles.js"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb } from "$lib/server/databases/index.js"

const getArticleWithLinks = async (
  id: string,
): Promise<ArticleWithLinks | undefined> =>
  (
    await legiDb<
      Array<{
        bloc_textuel: string | null
        data: JorfArticle | LegiArticle
        nota: string | null
      }>
    >`
      SELECT
        bloc_textuel,
        data,
        nota
      FROM article
      LEFT JOIN article_contenu_avec_liens ON article.id = article_contenu_avec_liens.id
      WHERE article.id = ${id}
    `
  ).map(
    ({ bloc_textuel: blocTextuel, data: article, nota }): ArticleWithLinks =>
      Object.fromEntries(
        Object.entries({
          article,
          blocTextuel,
          nota,
        }).filter((_key, value) => value !== null),
      ) as {
        article: JorfArticle | LegiArticle
        blocTextuel?: string
        nota?: string
      },
  )[0]

// export const queryArticle = query(
//   standardSchemaV1<string>(
//     cleanAudit,
//     auditTrimString,
//     auditEmptyToNull,
//     auditLegalId,
//     auditRequire,
//   ),
//   async (id): Promise<JorfArticle | LegiArticle | undefined> =>
//     await getOrLoadArticle(legiDb, newLegalObjectCacheByIdByCategorieTag(), id),
// )

// export const queryArticleContenuAvecLiens = query(
//   standardSchemaV1<string>(
//     cleanAudit,
//     auditTrimString,
//     auditEmptyToNull,
//     auditLegalId,
//     auditRequire,
//   ),
//   async (id): Promise<{ blocTextuel?: string; nota?: string } | undefined> => {
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
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<ArticlePageInfos | undefined> => {
    const articleWithLinks = await getArticleWithLinks(id)
    if (articleWithLinks === undefined) {
      return undefined
    }
    const legalObjectCacheByIdByCategorieTag =
      newLegalObjectCacheByIdByCategorieTag()
    return {
      ...articleWithLinks,
      nextArticleId: await getSiblingArticleId(
        legiDb,
        legalObjectCacheByIdByCategorieTag,
        id,
        1,
      ),
      previousArticleId: await getSiblingArticleId(
        legiDb,
        legalObjectCacheByIdByCategorieTag,
        id,
        -1,
      ),
    }
  },
)

export const queryArticleWithLinks = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<ArticleWithLinks | undefined> =>
    await getArticleWithLinks(id),
)
