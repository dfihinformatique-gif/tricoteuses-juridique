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

export interface ArticleExtension {
  num?: string
}

export type JorfArticleExtended = JorfArticle & ArticleExtension

export type LegalObjectCacheByIdByCategorieTag = Map<
  JorfCategorieTag | LegiCategorieTag,
  Map<string, JSONValue>
>

export type LegiArticleExtended = LegiArticle & ArticleExtension

export function extendLoadedArticle<
  ArticleType extends JorfArticle | LegiArticle,
>({
  data: article,
  num,
}: {
  data: ArticleType
  num: string | null
}): ArticleType & ArticleExtension {
  if (num !== null) {
    ;(article as ArticleType & ArticleExtension).num = num
  }
  return article
}

export async function getOrLoadArticle<
  ArticleType extends JorfArticle | LegiArticle,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
): Promise<(ArticleType & ArticleExtension) | undefined> {
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
          num: string | null
        }>
      >`
        SELECT data, num
        FROM article
        WHERE id = ${id}
      `
    ).map(extendLoadedArticle)[0]
    legalObjectCacheById.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export async function getOrLoadJo<JoType extends Jo>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
): Promise<JoType | undefined> {
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
): Promise<SectionTaType | undefined> {
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

export async function getOrLoadSectionsTa<
  SectionTaType extends JorfSectionTa | LegiSectionTa,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  ids: string[],
): Promise<SectionTaType[]> {
  let legalObjectCacheById =
    legalObjectCacheByIdByCategorieTag.get("SECTION_TA")
  if (legalObjectCacheById === undefined) {
    legalObjectCacheById = new Map()
    legalObjectCacheByIdByCategorieTag.set("SECTION_TA", legalObjectCacheById)
  }
  const idsToLoad = new Set(ids)
  const sectionsTa: SectionTaType[] = []
  for (const id of idsToLoad) {
    const sectionTa = legalObjectCacheById.get(id) as unknown as
      | SectionTaType
      | undefined
      | null
    if (sectionTa !== undefined) {
      idsToLoad.delete(id)
      if (sectionTa !== null) {
        sectionsTa.push(sectionTa)
      }
    }
  }
  if (idsToLoad.size > 0) {
    for (const sectionTa of (
      await legiDb<
        Array<{
          data: SectionTaType
        }>
      >`
        SELECT
          data
        FROM section_ta
        WHERE id IN ${legiDb([...idsToLoad])}
      `
    ).map(({ data }) => data)) {
      legalObjectCacheById.set(sectionTa.ID, sectionTa as unknown as JSONValue)
      sectionsTa.push(sectionTa)
    }
  }
  return sectionsTa
}

export async function getOrLoadTextelr<
  TextelrType extends JorfTextelr | LegiTextelr,
>(
  legiDb: Sql,
  legalObjectCacheByIdByCategorieTag: LegalObjectCacheByIdByCategorieTag,
  id: string,
): Promise<TextelrType | undefined> {
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
): Promise<TexteVersionType | undefined> {
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
