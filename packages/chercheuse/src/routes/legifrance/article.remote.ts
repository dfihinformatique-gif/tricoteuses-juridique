import {
  auditEmptyToNull,
  auditInteger,
  auditOptions,
  auditRequire,
  auditTrimString,
  auditTuple,
  cleanAudit,
} from "@auditors/core"
import {
  auditLegalId,
  type JorfArticle,
  type LegiArticle,
} from "@tricoteuses/legifrance"
import { assertNever } from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import type { ArticleWithLinks } from "$lib/articles.js"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { getSiblingArticleId } from "$lib/server/articles.js"
import { legiDb } from "$lib/server/databases/index.js"
import {
  /* getOrLoadArticle, */ newLegalObjectCacheById,
} from "$lib/server/loaders.js"

// export const queryArticle = query(
//   standardSchemaV1<string>(
//     cleanAudit,
//     auditTrimString,
//     auditEmptyToNull,
//     auditLegalId,
//     auditRequire,
//   ),
//   async (id): Promise<JorfArticle | LegiArticle | undefined> =>
//     await getOrLoadArticle(newLegalObjectCacheById(), id),
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

export const queryArticleWithLinks = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<ArticleWithLinks | undefined> =>
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
    )[0],
)

/**
 * TODO:
 * - Handle date to filter articles outside date
 * - Migrate everything except the query to @tricoteuses/legifrance.
 */
export const querySiblingArticleId = query(
  standardSchemaV1<[string, -1 | 1]>(
    cleanAudit,
    auditTuple(
      [auditTrimString, auditEmptyToNull, auditLegalId, auditRequire],
      [auditInteger, auditOptions([-1, 1]), auditRequire],
    ),
    auditRequire,
  ),
  async ([id, offset]): Promise<string | undefined> =>
    await getSiblingArticleId(newLegalObjectCacheById(), id, offset),
)
