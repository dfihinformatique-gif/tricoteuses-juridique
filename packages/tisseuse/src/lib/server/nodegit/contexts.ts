import nodegit from "nodegit"

import type {
  JorfArticle,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf.js"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"
import { db } from "$lib/server/databases/index.js"

import type { SimpleTreeEntry } from "./repositories.js"

export type Action = (typeof actions)[number]

export interface Context {
  articleById: Record<string, JorfArticle | LegiArticle | null>
  articleGitById: Record<
    string,
    {
      date: string
      path: string
    }
  >
  consolidatedIdsByActionByModifyingTextIdByDate: Record<
    string,
    Record<string, Partial<Record<Action, Set<string>>>>
  >
  consolidatedTextCid: string
  consolidatedTextInternalIds: Set<string>
  consolidatedTextModifyingTextsIdsByActionByDate: Record<
    string,
    Partial<Record<Action, Set<string>>>
  >
  // Current content of a text at a given date
  currentInternalIds: Set<string>
  // Allows to retrieve one of the integration/consolidation version of a
  // JORF object.
  // Needed, because for example, JORF articles of the Constitution have no
  // version other than themselves in VERSIONS.VERSION (but the other LEGI versions
  // are linked together in VERSIONS.VERSION).
  firstConsolidatedIdByJorfCreatorId: Record<string, string>
  // When a LEGI article, sectionTa or text has been created by the same JORF
  // article, sectionIa or text, ID of this JORF object
  jorfCreatorIdByConsolidatedId: Record<string, string>
  logReferences?: boolean
  modifierByActionByConsolidatedArticleId: Record<
    string,
    Partial<Record<Action, { date: string; priority: number; textId: string }>>
  >
  modifyingTextsIdsByArticleActionDate: Record<string, Set<string>>
  referringTextsLiensById: Record<string, TexteVersionLienDb[]>
  referringArticlesLiensById: Record<string, ArticleLienDb[]>
  repository: nodegit.Repository
  sectionTaById: Record<string, LegiSectionTa | null>
  sectionTaGitById: Record<
    string,
    {
      date: string
      path: string
    }
  >
  texteManquantById: Record<string, TexteManquant>
  textelrById: Record<string, JorfTextelr | LegiTextelr | null>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion | null>
  texteVersionGitById: Record<
    string,
    {
      date: string
      path: string
    }
  >
  textFileCacheByRepositoryRelativeFilePath: Record<string, TextFileCache>
}

interface TextFileCache {
  /**
   * Text that can change even when id doesn't change
   */
  custom?: string
  id: string
  treeEntry: SimpleTreeEntry
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
