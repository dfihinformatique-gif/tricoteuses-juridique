import {
  bestItemForDate,
  walkContexteTexteTm,
  type JorfArticle,
  type JorfArticleTm,
  type JorfSectionTa,
  type JorfSectionTaTm,
  type LegiArticle,
  type LegiArticleTm,
  type LegiSectionTa,
  type LegiSectionTaTm,
} from "@tricoteuses/legifrance"
import { assertNever } from "@tricoteuses/tisseuse"

import {
  getOrLoadArticle,
  getOrLoadSectionTa,
  // newLegalObjectCacheById,
  type LegalObjectCacheById,
} from "./loaders.js"

/**
 * TODO: Migrate to @tricoteuses/legifrance
 */
export async function getArticleDateSignature(
  article: JorfArticle | LegiArticle,
  // legalObjectCacheById: LegalObjectCacheById = newLegalObjectCacheById(),
): Promise<string> {
  const dateSignature = article.CONTEXTE.TEXTE["@date_signature"]
  if (dateSignature === undefined) {
    throw new Error("TODO")
  }
  return dateSignature
}

async function getSectionTaState(
  legalObjectCacheById: LegalObjectCacheById,
  sectionTaId: string,
  sectionTaStateById: Record<
    string,
    {
      area: "LIEN_ART" | "LIEN_SECTION_TA"
      index: number
      sectionTa: JorfSectionTa | LegiSectionTa
    }
  >,
  articleId: string,
  childSectionTaId: string | undefined,
): Promise<
  | {
      area: "LIEN_ART" | "LIEN_SECTION_TA"
      index: number
      sectionTa: JorfSectionTa | LegiSectionTa
    }
  | undefined
> {
  let sectionTaState = sectionTaStateById[sectionTaId]
  if (sectionTaState === undefined) {
    const sectionTa = await getOrLoadSectionTa(
      legalObjectCacheById,
      sectionTaId,
    )
    if (sectionTa === undefined) {
      return undefined
    }
    const structureTa = sectionTa.STRUCTURE_TA
    if (structureTa === undefined) {
      return undefined
    }
    if (childSectionTaId === undefined) {
      const liensArticles = structureTa.LIEN_ART
      if (liensArticles === undefined) {
        return undefined
      }
      const index = liensArticles.findIndex(
        (lienArticle) => lienArticle["@id"] === articleId,
      )
      if (index === -1) {
        return undefined
      }
      sectionTaStateById[sectionTaId] = sectionTaState = {
        area: "LIEN_ART",
        index,
        sectionTa,
      }
    } else {
      const liensSectionsTa = structureTa.LIEN_SECTION_TA
      if (liensSectionsTa === undefined) {
        return undefined
      }
      const index = liensSectionsTa.findIndex(
        (lienSectionTa) => lienSectionTa["@id"] === childSectionTaId,
      )
      if (index === -1) {
        return undefined
      }
      sectionTaStateById[sectionTaId] = sectionTaState = {
        area: "LIEN_SECTION_TA",
        index,
        sectionTa,
      }
    }
  }
  return sectionTaState
}

/**
 * TODO:
 * - Handle date to filter articles outside date
 * - Migrate everything except the query to @tricoteuses/legifrance.
 */
export async function getSiblingArticleId(
  legalObjectCacheById: LegalObjectCacheById,
  id: string,
  offset: -1 | 1,
): Promise<string | undefined> {
  const article = await getOrLoadArticle(legalObjectCacheById, id)
  if (article === undefined) {
    return undefined
  }
  const date = await getArticleDateSignature(article)
  const origine = article.META.META_COMMUN.ORIGINE
  const texte = article.CONTEXTE.TEXTE
  if (texte.TM === undefined) {
    return undefined
  }
  const reverseTmsBreadcrumb = walkContexteTexteTm(texte.TM).toArray().reverse()
  let reverseSectionsTaIdBreadcrumb: Array<string | undefined>
  switch (origine) {
    case "JORF": {
      reverseSectionsTaIdBreadcrumb = (
        reverseTmsBreadcrumb as Array<JorfArticleTm | JorfSectionTaTm>
      ).map((tm) => tm.TITRE_TM["@id"])
      break
    }
    case "LEGI": {
      reverseSectionsTaIdBreadcrumb = (
        reverseTmsBreadcrumb as Array<LegiArticleTm | LegiSectionTaTm>
      ).map((tm) => bestItemForDate(tm.TITRE_TM, date)?.["@id"])
      break
    }
    default: {
      assertNever("getSiblingArticleId origine", origine)
    }
  }
  // TODO: Filter sibling article by date.
  return await (offset === -1 ? moveToPreviousArticleId : moveToNextArticleId)(
    legalObjectCacheById,
    id,
    reverseSectionsTaIdBreadcrumb,
  )
}

async function moveToFirstArticleId(
  legalObjectCacheById: LegalObjectCacheById,
  sectionTaId: string,
): Promise<string | undefined> {
  const sectionTa = await getOrLoadSectionTa(legalObjectCacheById, sectionTaId)
  if (sectionTa === undefined) {
    return undefined
  }
  const structureTa = sectionTa.STRUCTURE_TA
  if (structureTa === undefined) {
    return undefined
  }
  const liensArticles = structureTa.LIEN_ART
  if (liensArticles !== undefined) {
    return liensArticles[0]["@id"]
  }
  const liensSectionsTa = structureTa.LIEN_SECTION_TA
  if (liensSectionsTa !== undefined) {
    for (const lienSectionTa of liensSectionsTa) {
      const firstArticleId = await moveToFirstArticleId(
        legalObjectCacheById,
        lienSectionTa["@id"],
      )
      if (firstArticleId !== undefined) {
        return firstArticleId
      }
    }
  }
  return undefined
}

async function moveToLastArticleId(
  legalObjectCacheById: LegalObjectCacheById,
  sectionTaId: string,
): Promise<string | undefined> {
  const sectionTa = await getOrLoadSectionTa(legalObjectCacheById, sectionTaId)
  if (sectionTa === undefined) {
    return undefined
  }
  const structureTa = sectionTa.STRUCTURE_TA
  if (structureTa === undefined) {
    return undefined
  }
  const liensSectionsTa = structureTa.LIEN_SECTION_TA
  if (liensSectionsTa !== undefined) {
    for (const lienSectionTa of liensSectionsTa.toReversed()) {
      const lastArticleId = await moveToLastArticleId(
        legalObjectCacheById,
        lienSectionTa["@id"],
      )
      if (lastArticleId !== undefined) {
        return lastArticleId
      }
    }
  }
  return structureTa.LIEN_ART?.at(-1)?.["@id"]
}

async function moveToNextArticleId(
  legalObjectCacheById: LegalObjectCacheById,
  articleId: string,
  reverseSectionsTaIdBreadcrumb: Array<string | undefined>,
  tmIndex = 0,
  sectionTaStateById: Record<
    string,
    {
      area: "LIEN_ART" | "LIEN_SECTION_TA"
      index: number
      sectionTa: JorfSectionTa | LegiSectionTa
    }
  > = {},
  childSectionTaId: string | undefined = undefined,
): Promise<string | undefined> {
  const sectionTaId = reverseSectionsTaIdBreadcrumb[tmIndex]
  if (sectionTaId === undefined) {
    return undefined
  }
  const sectionTaState = await getSectionTaState(
    legalObjectCacheById,
    sectionTaId,
    sectionTaStateById,
    articleId,
    childSectionTaId,
  )
  if (sectionTaState === undefined) {
    return undefined
  }
  const { area, index, sectionTa } = sectionTaState
  const structureTa = sectionTa.STRUCTURE_TA!
  switch (area) {
    case "LIEN_ART": {
      if (index === structureTa.LIEN_ART!.length - 1) {
        const liensSectionsTa = structureTa.LIEN_SECTION_TA
        if (liensSectionsTa !== undefined) {
          for (const lienSectionTa of liensSectionsTa) {
            const firstArticleId = await moveToFirstArticleId(
              legalObjectCacheById,
              lienSectionTa["@id"],
            )
            if (firstArticleId !== undefined) {
              return firstArticleId
            }
          }
        }
        return await moveToNextArticleId(
          legalObjectCacheById,
          articleId,
          reverseSectionsTaIdBreadcrumb,
          tmIndex + 1,
          sectionTaStateById,
          sectionTaId,
        )
      }
      return structureTa.LIEN_ART![index + 1]["@id"]
    }

    case "LIEN_SECTION_TA": {
      const liensSectionsTa = structureTa.LIEN_SECTION_TA!
      for (
        let sectionTaIndex = index + 1;
        sectionTaIndex < liensSectionsTa.length;
        sectionTaIndex++
      ) {
        const firstArticleId = await moveToFirstArticleId(
          legalObjectCacheById,
          liensSectionsTa[sectionTaIndex]["@id"],
        )
        if (firstArticleId !== undefined) {
          return firstArticleId
        }
      }
      return await moveToNextArticleId(
        legalObjectCacheById,
        articleId,
        reverseSectionsTaIdBreadcrumb,
        tmIndex + 1,
        sectionTaStateById,
        sectionTaId,
      )
    }

    default: {
      assertNever("moveToNextArticleId area", area)
    }
  }
}

async function moveToPreviousArticleId(
  legalObjectCacheById: LegalObjectCacheById,
  articleId: string,
  reverseSectionsTaIdBreadcrumb: Array<string | undefined>,
  tmIndex = 0,
  sectionTaStateById: Record<
    string,
    {
      area: "LIEN_ART" | "LIEN_SECTION_TA"
      index: number
      sectionTa: JorfSectionTa | LegiSectionTa
    }
  > = {},
  childSectionTaId: string | undefined = undefined,
): Promise<string | undefined> {
  const sectionTaId = reverseSectionsTaIdBreadcrumb[tmIndex]
  if (sectionTaId === undefined) {
    return undefined
  }
  const sectionTaState = await getSectionTaState(
    legalObjectCacheById,
    sectionTaId,
    sectionTaStateById,
    articleId,
    childSectionTaId,
  )
  if (sectionTaState === undefined) {
    return undefined
  }
  const { area, index, sectionTa } = sectionTaState
  const structureTa = sectionTa.STRUCTURE_TA!
  switch (area) {
    case "LIEN_ART": {
      if (index === 0) {
        return await moveToPreviousArticleId(
          legalObjectCacheById,
          articleId,
          reverseSectionsTaIdBreadcrumb,
          tmIndex + 1,
          sectionTaStateById,
          sectionTaId,
        )
      }
      return structureTa.LIEN_ART![index - 1]["@id"]
    }

    case "LIEN_SECTION_TA": {
      for (
        let sectionTaIndex = index - 1;
        sectionTaIndex >= 0;
        sectionTaIndex--
      ) {
        const lastArticleId = await moveToLastArticleId(
          legalObjectCacheById,
          structureTa.LIEN_SECTION_TA![sectionTaIndex]["@id"],
        )
        if (lastArticleId !== undefined) {
          return lastArticleId
        }
      }
      const liensArticles = structureTa.LIEN_ART
      if (liensArticles !== undefined) {
        sectionTaState.area = "LIEN_ART"
        sectionTaState.index = liensArticles.length
        return await moveToPreviousArticleId(
          legalObjectCacheById,
          articleId,
          reverseSectionsTaIdBreadcrumb,
          tmIndex,
          sectionTaStateById,
        )
      }
      return await moveToPreviousArticleId(
        legalObjectCacheById,
        articleId,
        reverseSectionsTaIdBreadcrumb,
        tmIndex + 1,
        sectionTaStateById,
        sectionTaId,
      )
    }

    default: {
      assertNever("moveToPreviousArticleId area", area)
    }
  }
}
