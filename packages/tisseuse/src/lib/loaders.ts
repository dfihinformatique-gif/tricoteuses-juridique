import type {
  Jo,
  JorfArticle,
  JorfCategorieTag,
  JorfSectionTa,
  JorfTextelr,
  JorfTexteVersion,
  LegiArticle,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"
import type { JSONValue, Sql } from "postgres"

export type LegalObjectCacheByIdByCategorieTag = Map<
  JorfCategorieTag | LegiCategorieTag,
  Map<string, JSONValue>
>

export async function getOrLoadArticle<
  ArticleType extends JorfArticle | LegiArticle,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
) {
  let legalObjectCacheById = legalObjectCacheByIdByCategorieTag.get("ARTICLE")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set("ARTICLE", legalObjectCacheById)
  }
  let article = legalObjectCacheById.get(id) as ArticleType | undefined | null
  if (article === undefined) {
    article = (
      await legiDb<
        Array<{
          data: ArticleType
        }>
      >`
        SELECT
          data
        FROM article
        WHERE id = ${id}
      `
    )[0]?.data
    legalObjectCacheById.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export async function getOrLoadJo<JoType extends Jo>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
) {
  let legalObjectCacheById = legalObjectCacheByIdByCategorieTag.get("JO")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set("JO", legalObjectCacheById)
  }
  let jo = legalObjectCacheById.get(id) as JoType | undefined | null
  if (jo === undefined) {
    jo = (
      await legiDb<
        Array<{
          data: JoType
        }>
      >`
        SELECT
          data
        FROM jo
        WHERE id = ${id}
      `
    )[0]?.data
    legalObjectCacheById.set(id, (jo as unknown as JSONValue) ?? null)
  }
  return jo ?? undefined
}

export async function getOrLoadSectionTa<
  SectionTaType extends JorfSectionTa | LegiSectionTa,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
) {
  let legalObjectCacheById =
    legalObjectCacheByIdByCategorieTag.get("SECTION_TA")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set("SECTION_TA", legalObjectCacheById)
  }
  let sectionTa = legalObjectCacheById.get(id) as
    | SectionTaType
    | undefined
    | null
  if (sectionTa === undefined) {
    sectionTa = (
      await legiDb<
        Array<{
          data: SectionTaType
        }>
      >`
        SELECT
          data
        FROM section_ta
        WHERE id = ${id}
      `
    )[0]?.data
    legalObjectCacheById.set(id, (sectionTa as unknown as JSONValue) ?? null)
  }
  return sectionTa ?? undefined
}

export async function getOrLoadTextelr<
  TextelrType extends JorfTextelr | LegiTextelr,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
) {
  let legalObjectCacheById = legalObjectCacheByIdByCategorieTag.get("TEXTELR")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set("TEXTELR", legalObjectCacheById)
  }
  let article = legalObjectCacheById.get(id) as TextelrType | undefined | null
  if (article === undefined) {
    article = (
      await legiDb<
        Array<{
          data: TextelrType
        }>
      >`
        SELECT
          data
        FROM textelr
        WHERE id = ${id}
      `
    )[0]?.data
    legalObjectCacheById.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export async function getOrLoadTexteVersion<
  TexteVersionType extends JorfTexteVersion | LegiTexteVersion,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
) {
  let legalObjectCacheById =
    legalObjectCacheByIdByCategorieTag.get("TEXTE_VERSION")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set(
      "TEXTE_VERSION",
      legalObjectCacheById,
    )
  }
  let article = legalObjectCacheById.get(id) as
    | TexteVersionType
    | undefined
    | null
  if (article === undefined) {
    article = (
      await legiDb<
        Array<{
          data: TexteVersionType
        }>
      >`
        SELECT
          data
        FROM textelr
        WHERE id = ${id}
      `
    )[0]?.data
    legalObjectCacheById.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export const newLegalObjectCacheByIdByCategorieTag =
  (): LegalObjectCacheByIdByCategorieTag =>
    new Map<JorfCategorieTag | LegiCategorieTag, Map<string, JSONValue>>()
