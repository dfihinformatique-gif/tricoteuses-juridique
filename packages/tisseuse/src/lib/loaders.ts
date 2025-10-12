import {
  type Jo,
  type JorfArticle,
  type JorfSectionTa,
  type LegiArticle,
  type LegiSectionTa,
} from "@tricoteuses/legifrance"
import type { JSONValue, Sql } from "postgres"

export type LegalObjectCacheById = Map<string, JSONValue>

export async function getOrLoadArticle<
  ArticleType extends JorfArticle | LegiArticle,
>(legiDb: Sql, legalObjectCacheById: LegalObjectCacheById, id: string) {
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
  legalObjectCacheById: LegalObjectCacheById,
  id: string,
) {
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
>(legiDb: Sql, legalObjectCacheById: LegalObjectCacheById, id: string) {
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

export const newLegalObjectCacheById = (): LegalObjectCacheById =>
  new Map<string, JSONValue>()
