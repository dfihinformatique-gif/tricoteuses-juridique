import type {
  Jo,
  JorfArticle,
  JorfSectionTa,
  JorfTextelr,
  JorfTexteVersion,
  LegiArticle,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"
import type { JSONValue, Sql } from "postgres"

import type { LegifranceObjectCache } from "$lib/cache.js"

export interface ArticleExtension {
  num?: string
}

export type JorfArticleExtended = JorfArticle & ArticleExtension

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
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<(ArticleType & ArticleExtension) | undefined> {
  let articleCache = legifranceObjectCache.get("ARTICLE")
  if (articleCache === undefined) {
    articleCache = new Map()
    legifranceObjectCache.set("ARTICLE", articleCache)
  }
  let article = articleCache.get(id) as ArticleType | undefined | null
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
    articleCache.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export async function getOrLoadJo<JoType extends Jo>(
  legiDb: Sql,
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<JoType | undefined> {
  let joCache = legifranceObjectCache.get("JO")
  if (joCache === undefined) {
    joCache = new Map()
    legifranceObjectCache.set("JO", joCache)
  }
  let jo = joCache.get(id) as JoType | undefined | null
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
    joCache.set(id, (jo as unknown as JSONValue) ?? null)
  }
  return jo ?? undefined
}

export async function getOrLoadSectionTa<
  SectionTaType extends JorfSectionTa | LegiSectionTa,
>(
  legiDb: Sql,
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<SectionTaType | undefined> {
  let sectionTaCache = legifranceObjectCache.get("SECTION_TA")
  if (sectionTaCache === undefined) {
    sectionTaCache = new Map()
    legifranceObjectCache.set("SECTION_TA", sectionTaCache)
  }
  let sectionTa = sectionTaCache.get(id) as SectionTaType | undefined | null
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
    sectionTaCache.set(id, (sectionTa as unknown as JSONValue) ?? null)
  }
  return sectionTa ?? undefined
}

export async function getOrLoadSectionsTa<
  SectionTaType extends JorfSectionTa | LegiSectionTa,
>(
  legiDb: Sql,
  legifranceObjectCache: LegifranceObjectCache,
  ids: string[],
): Promise<SectionTaType[]> {
  let sectionTaCache = legifranceObjectCache.get("SECTION_TA")
  if (sectionTaCache === undefined) {
    sectionTaCache = new Map()
    legifranceObjectCache.set("SECTION_TA", sectionTaCache)
  }
  const idsToLoad = new Set(ids)
  const sectionsTa: SectionTaType[] = []
  for (const id of idsToLoad) {
    const sectionTa = sectionTaCache.get(id) as unknown as
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
      sectionTaCache.set(sectionTa.ID, sectionTa as unknown as JSONValue)
      sectionsTa.push(sectionTa)
    }
  }
  return sectionsTa
}

export async function getOrLoadTextelr<
  TextelrType extends JorfTextelr | LegiTextelr,
>(
  legiDb: Sql,
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<TextelrType | undefined> {
  let textelrCache = legifranceObjectCache.get("TEXTELR")
  if (textelrCache === undefined) {
    textelrCache = new Map()
    legifranceObjectCache.set("TEXTELR", textelrCache)
  }
  let article = textelrCache.get(id) as TextelrType | undefined | null
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
    textelrCache.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}

export async function getOrLoadTexteVersion<
  TexteVersionType extends JorfTexteVersion | LegiTexteVersion,
>(
  legiDb: Sql,
  legifranceObjectCache: LegifranceObjectCache,
  id: string,
): Promise<TexteVersionType | undefined> {
  let texteVersionCache = legifranceObjectCache.get("TEXTE_VERSION")
  if (texteVersionCache === undefined) {
    texteVersionCache = new Map()
    legifranceObjectCache.set("TEXTE_VERSION", texteVersionCache)
  }
  let article = texteVersionCache.get(id) as TexteVersionType | undefined | null
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
    texteVersionCache.set(id, (article as unknown as JSONValue) ?? null)
  }
  return article ?? undefined
}
