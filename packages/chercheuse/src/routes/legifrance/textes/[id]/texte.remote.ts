import { auditTrimString, cleanAudit } from "@auditors/core"
import type {
  JorfArticle,
  JorfSectionTa,
  JorfTextelr,
  JorfTexteVersion,
  LegiArticle,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema"
import { legiDb } from "$lib/server/databases/index.js"

export const getArticle = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString),
  async (id): Promise<JorfArticle | LegiArticle | undefined> =>
    (
      await legiDb<
        Array<{
          data: JorfArticle | LegiArticle
        }>
      >`
        SELECT
          data
        FROM article
        WHERE id = ${id}
      `
    )[0]?.data,
)

export const getArticleContenuAvecLiens = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString),
  async (id): Promise<{ blocTextuel: string } | undefined> => {
    const blocTextuel = (
      await legiDb<
        Array<{
          bloc_textuel: string
        }>
      >`
        SELECT
          bloc_textuel
        FROM article_contenu_avec_liens
        WHERE id = ${id}
      `
    )[0]?.bloc_textuel
    return {
      blocTextuel,
    }
  },
)

export const getSectionTa = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString),
  async (id): Promise<JorfSectionTa | LegiSectionTa | undefined> =>
    (
      await legiDb<
        Array<{
          data: JorfSectionTa | LegiSectionTa
        }>
      >`
        SELECT
          data
        FROM section_ta
        WHERE id = ${id}
      `
    )[0]?.data,
)

export const getTexte = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString),
  async (
    id,
  ): Promise<{
    textelr?: JorfTextelr | LegiTextelr | undefined
    texteVersion?: JorfTexteVersion | LegiTexteVersion | undefined
  }> =>
    Object.fromEntries(
      await Promise.all([
        (async () => [
          "textelr",
          (
            await legiDb<
              Array<{
                data: JorfTextelr | LegiTextelr
              }>
            >`
              SELECT
                data
              FROM textelr
              WHERE id = ${id}
            `
          )[0]?.data,
        ])(),
        (async () => [
          "texteVersion",
          (
            await legiDb<
              Array<{
                data: JorfTexteVersion | LegiTexteVersion
              }>
            >`
              SELECT
                data
              FROM texte_version
              WHERE id = ${id}
            `
          )[0]?.data,
        ])(),
      ]),
    ) as {
      textelr?: JorfTextelr | LegiTextelr
      texteVersion?: JorfTexteVersion | LegiTexteVersion
    },
)
