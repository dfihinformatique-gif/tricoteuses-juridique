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
import type { Sql } from "postgres"

import { assertNever } from "./asserts.js"
import {
  getOrLoadArticle,
  getOrLoadSectionTa,
  // newLegalObjectCacheById,
  type LegalObjectCacheById,
} from "./loaders.js"

/**
 * TODO: Migrate to @tricoteuses/legifrance
 */
export function getArticleDateSignature(
  article: JorfArticle | LegiArticle,
  // legalObjectCacheById: LegalObjectCacheById = newLegalObjectCacheById(),
): string {
  const dateDebut = article.META.META_SPEC.META_ARTICLE.DATE_DEBUT
  if (
    dateDebut !== undefined &&
    !["2222-02-22", "2999-01-01"].includes(dateDebut)
  ) {
    // When article.META.META_SPEC.META_ARTICLE.DATE_DEBUT is valid, use it as an
    // approximation of date_signature.
    // Note: this date is a wrong approximation when VIGUEUR_DIFF, etc.
    return dateDebut
  }
  // Note: article.CONTEXTE.TEXTE["@date_signature"] is always the date_signature of
  // the first JORF text, so it is not the good date signature for LEGI articles.
  const dateSignature = article.CONTEXTE.TEXTE["@date_signature"]
  if (
    dateSignature !== undefined &&
    !["2222-02-22", "2999-01-01"].includes(dateSignature)
  ) {
    return dateSignature
  }
  // Occurs for example:
  // * for LEGIARTI000037943822 (MODIFIE_MORT_NE) with a dateDebut of "2222-02-22".
  // * for LEGIARTI000048157126 (MODIFIE) with a dateDebut of "2999-01-01".
  // When there is no valid dateDebut, try to use  dateFin as a proxy of dateDebut
  // that is itself a proxy of dateFin.
  const dateFin = article.META.META_SPEC.META_ARTICLE.DATE_FIN
  if (
    dateFin !== undefined &&
    !["2222-02-22", "2999-01-01"].includes(dateFin)
  ) {
    return dateFin
  }
  if (dateDebut === "2222-02-22") {
    // Occurs, for example, for LEGIARTI000051214570.
    // There is no valid date for this article.
    // => return dateDebut to avoid failing.
    return dateDebut
  }
  // Since, currently, we don't handle events in LIENS.LIEN, no valid date
  // is found.
  throw new Error(
    `Missing date signature in text ${article.META.META_COMMUN.ID}`,
  )
}

async function getSectionTaState(
  legiDb: Sql,
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
      legiDb,
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
  legiDb: Sql,
  legalObjectCacheById: LegalObjectCacheById,
  id: string,
  offset: -1 | 1,
): Promise<string | undefined> {
  const article = await getOrLoadArticle(legiDb, legalObjectCacheById, id)
  if (article === undefined) {
    return undefined
  }
  const date = getArticleDateSignature(article)
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
    legiDb,
    legalObjectCacheById,
    id,
    date,
    article.META.META_SPEC.META_ARTICLE.NUM,
    reverseSectionsTaIdBreadcrumb,
  )
}

async function moveToFirstArticleId(
  legiDb: Sql,
  legalObjectCacheById: LegalObjectCacheById,
  sectionTaId: string,
): Promise<string | undefined> {
  const sectionTa = await getOrLoadSectionTa(
    legiDb,
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
  const liensArticles = structureTa.LIEN_ART
  if (liensArticles !== undefined) {
    return liensArticles[0]["@id"]
  }
  const liensSectionsTa = structureTa.LIEN_SECTION_TA
  if (liensSectionsTa !== undefined) {
    for (const lienSectionTa of liensSectionsTa) {
      const firstArticleId = await moveToFirstArticleId(
        legiDb,
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
  legiDb: Sql,
  legalObjectCacheById: LegalObjectCacheById,
  sectionTaId: string,
): Promise<string | undefined> {
  const sectionTa = await getOrLoadSectionTa(
    legiDb,
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
  const liensSectionsTa = structureTa.LIEN_SECTION_TA
  if (liensSectionsTa !== undefined) {
    for (const lienSectionTa of liensSectionsTa.toReversed()) {
      const lastArticleId = await moveToLastArticleId(
        legiDb,
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
  legiDb: Sql,
  legalObjectCacheById: LegalObjectCacheById,
  articleId: string,
  articleDate: string,
  articleNum: string | undefined,
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
    legiDb,
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
      const liensArticles = structureTa.LIEN_ART!
      for (
        let nextIndex = index + 1;
        nextIndex < liensArticles.length;
        nextIndex++
      ) {
        const lienNextArticle = liensArticles[nextIndex]
        if (lienNextArticle["@num"] !== articleNum) {
          const nextArticle = await getOrLoadArticle(
            legiDb,
            legalObjectCacheById,
            lienNextArticle["@id"],
          )
          if (
            nextArticle !== undefined &&
            getArticleDateSignature(nextArticle) <= articleDate
          ) {
            return lienNextArticle["@id"]
          }
        }
      }
      const liensSectionsTa = structureTa.LIEN_SECTION_TA
      if (liensSectionsTa !== undefined) {
        for (const lienSectionTa of liensSectionsTa) {
          const firstArticleId = await moveToFirstArticleId(
            legiDb,
            legalObjectCacheById,
            lienSectionTa["@id"],
          )
          if (firstArticleId !== undefined) {
            return firstArticleId
          }
        }
      }
      return await moveToNextArticleId(
        legiDb,
        legalObjectCacheById,
        articleId,
        articleDate,
        articleNum,
        reverseSectionsTaIdBreadcrumb,
        tmIndex + 1,
        sectionTaStateById,
        sectionTaId,
      )
    }

    case "LIEN_SECTION_TA": {
      const liensSectionsTa = structureTa.LIEN_SECTION_TA!
      for (
        let sectionTaIndex = index + 1;
        sectionTaIndex < liensSectionsTa.length;
        sectionTaIndex++
      ) {
        const firstArticleId = await moveToFirstArticleId(
          legiDb,
          legalObjectCacheById,
          liensSectionsTa[sectionTaIndex]["@id"],
        )
        if (firstArticleId !== undefined) {
          return firstArticleId
        }
      }
      return await moveToNextArticleId(
        legiDb,
        legalObjectCacheById,
        articleId,
        articleDate,
        articleNum,
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
  legiDb: Sql,
  legalObjectCacheById: LegalObjectCacheById,
  articleId: string,
  articleDate: string,
  articleNum: string | undefined,
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
    legiDb,
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
      const liensArticles = structureTa.LIEN_ART!
      for (let previousIndex = index - 1; previousIndex >= 0; previousIndex--) {
        const lienPreviousArticle = liensArticles[previousIndex]
        if (lienPreviousArticle["@num"] !== articleNum) {
          const previousArticle = await getOrLoadArticle(
            legiDb,
            legalObjectCacheById,
            lienPreviousArticle["@id"],
          )
          if (
            previousArticle !== undefined &&
            getArticleDateSignature(previousArticle) <= articleDate
          ) {
            return lienPreviousArticle["@id"]
          }
        }
      }
      return await moveToPreviousArticleId(
        legiDb,
        legalObjectCacheById,
        articleId,
        articleDate,
        articleNum,
        reverseSectionsTaIdBreadcrumb,
        tmIndex + 1,
        sectionTaStateById,
        sectionTaId,
      )
    }

    case "LIEN_SECTION_TA": {
      for (
        let sectionTaIndex = index - 1;
        sectionTaIndex >= 0;
        sectionTaIndex--
      ) {
        const lastArticleId = await moveToLastArticleId(
          legiDb,
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
          legiDb,
          legalObjectCacheById,
          articleId,
          articleDate,
          articleNum,
          reverseSectionsTaIdBreadcrumb,
          tmIndex,
          sectionTaStateById,
        )
      }
      return await moveToPreviousArticleId(
        legiDb,
        legalObjectCacheById,
        articleId,
        articleDate,
        articleNum,
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
