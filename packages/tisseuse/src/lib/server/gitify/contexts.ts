import type {
  JorfArticle,
  JorfSectionTa,
  JorfSectionTaLienArt,
  JorfSectionTaLienSectionTa,
  JorfSectionTaStructure,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { db } from "$lib/server/databases"

export type Action = (typeof actions)[number]

interface ArticleCache {
  id: string
  markdown: string
  repositoryRelativeFilePath: string
}

export interface Context {
  articleById: Record<string, JorfArticle | LegiArticle | null>
  articleCacheByNumber: Record<string, ArticleCache>
  consolidatedIdsByActionByModifyingTextIdByDate: Record<
    string,
    Record<string, Partial<Record<Action, Set<string>>>>
  >
  consolidatedTextCid: string
  consolidatedTextInternalIds: Set<string>
  consolidatedTextModifyingTextsIdsByActionByPublicationDate: Record<
    string,
    Partial<Record<Action, Set<string>>>
  >
  // Current content of a text at a given date
  currentInternalIds: Set<string>
  hasModifyingTextIdByActionByConsolidatedArticleId: Record<
    string,
    Partial<Record<Action, boolean>>
  >
  // When a LEGI article, sectionTa or text has been created by the same JORF
  // article, sectionIa or text, ID of this JORF object
  jorfCreatorIdByConsolidatedId: Record<string, string>
  logReferences?: boolean
  modifyingArticleIdByActionByConsolidatedId: Record<
    string,
    Partial<Record<Action, string>>
  >
  modifyingTextsIdsByArticleActionDate: Record<string, Set<string>>
  sectionTaById: Record<string, LegiSectionTa | null>
  targetDir: string
  texteManquantById: Record<string, TexteManquant>
  textelrById: Record<string, JorfTextelr | LegiTextelr | null>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion | null>
}

export interface TexteManquant {
  publicationDate: string
}

export const actions = ["CREATE", "DELETE"] as const

export async function getOrLoadArticle(
  context: Context,
  articleId: string,
): Promise<JorfArticle | LegiArticle | null> {
  let article: JorfArticle | LegiArticle | null = context.articleById[articleId]
  if (article === undefined) {
    article = (
      await db<{ data: JorfArticle | LegiArticle }[]>`
        SELECT data FROM article WHERE id = ${articleId}
      `
    )[0]?.data
    if (article === undefined) {
      console.warn(`Article ${articleId} not found in table article`)
      article = null
    }
    context.articleById[articleId] = article
  }
  return article
}

export async function getOrLoadSectionTa(
  context: Context,
  sectionTaId: string,
): Promise<LegiSectionTa | null> {
  let sectionTa: LegiSectionTa | null = context.sectionTaById[sectionTaId]
  if (sectionTa === undefined) {
    sectionTa = (
      await db<{ data: LegiSectionTa }[]>`
        SELECT data FROM section_ta WHERE id = ${sectionTaId}
      `
    )[0]?.data
    if (sectionTa === undefined) {
      console.warn(`SectionTA ${sectionTaId} not found in table section_ta`)
      sectionTa = null
    }
    context.sectionTaById[sectionTaId] = sectionTa
  }
  return sectionTa
}

export async function getOrLoadTextelr(
  context: Context,
  texteId: string,
): Promise<JorfTextelr | LegiTextelr | null> {
  let textelr: JorfTextelr | LegiTextelr | null = context.textelrById[texteId]
  if (textelr === undefined) {
    textelr = (
      await db<{ data: JorfTextelr | LegiTextelr }[]>`
          SELECT data FROM textelr WHERE id = ${texteId}
        `
    )[0]?.data
    if (textelr === undefined) {
      console.warn(`Texte ${texteId} not found in table textelr`)
      textelr = null
    }
    context.textelrById[texteId] = textelr
  }
  return textelr
}

export async function getOrLoadTexteVersion(
  context: Context,
  texteId: string,
): Promise<JorfTexteVersion | LegiTexteVersion | null> {
  let texteVersion: JorfTexteVersion | LegiTexteVersion | null =
    context.texteVersionById[texteId]
  if (texteVersion === undefined) {
    texteVersion = (
      await db<{ data: JorfTexteVersion | LegiTexteVersion }[]>`
          SELECT data FROM texte_version WHERE id = ${texteId}
        `
    )[0]?.data
    if (texteVersion === undefined) {
      console.warn(`Texte ${texteId} not found in table texte_version`)
      texteVersion = null
    }
    context.texteVersionById[texteId] = texteVersion
  }
  return texteVersion
}

export async function* walkStructureTree(
  context: Context,
  structure: JorfSectionTaStructure | LegiSectionTaStructure,
  parentsSectionTa: LegiSectionTa[] = [],
): AsyncGenerator<
  {
    lienSectionTa: JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    liensSectionTa: Array<
      JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    >
    parentsSectionTa: Array<JorfSectionTa | LegiSectionTa>
    sectionTa: JorfSectionTa | LegiSectionTa
  },
  void
> {
  const liensSectionTa = structure?.LIEN_SECTION_TA
  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const childSectionTa = await getOrLoadSectionTa(
        context,
        lienSectionTa["@id"],
      )
      if (childSectionTa !== null) {
        yield {
          lienSectionTa,
          liensSectionTa,
          parentsSectionTa,
          sectionTa: childSectionTa,
        }
        const childStructure = childSectionTa.STRUCTURE_TA
        if (childStructure !== undefined) {
          yield* walkStructureTree(context, childStructure, [
            ...parentsSectionTa,
            childSectionTa,
          ])
        }
      }
    }
  }
}

export async function* walkTextelrLiensArticles(
  context: Context,
  textelr: JorfTextelr | LegiTextelr,
): AsyncGenerator<
  {
    lienArticle: JorfSectionTaLienArt | LegiSectionTaLienArt
    lienSectionTa?: JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    liensSectionTa?: Array<
      JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    >
    parentsSectionTa?: Array<JorfSectionTa | LegiSectionTa>
    sectionTa?: JorfSectionTa | LegiSectionTa
  },
  void
> {
  const structure = textelr.STRUCT
  const liensArticles = structure?.LIEN_ART
  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      yield { lienArticle }
    }
  }
  for await (const {
    lienSectionTa,
    liensSectionTa,
    parentsSectionTa,
    sectionTa,
  } of walkStructureTree(
    context,
    structure as JorfSectionTaStructure | LegiSectionTaStructure,
  )) {
    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        yield {
          lienArticle,
          lienSectionTa,
          liensSectionTa,
          parentsSectionTa,
          sectionTa,
        }
      }
    }
  }
}
