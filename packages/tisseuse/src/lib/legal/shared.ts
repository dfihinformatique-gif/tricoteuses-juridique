export interface ArticleGitDb {
  id: string
  date: string
  path: string
}

export interface ArticleLienDb {
  article_id: string
  cible: boolean
  cidtexte: string | null
  id: string
  typelien: string
}

export type ArticleType = (typeof allArticleTypes)[number]

export interface SectionTaGitDb {
  id: string
  date: string
  path: string
}

export type Sens = (typeof allSens)[number]

export interface TexteVersionLienDb {
  texte_version_id: string
  cible: boolean
  cidtexte: string | null
  id: string
  typelien: string
}

export interface TexteVersionGitDb {
  id: string
  date: string
  path: string
}

export const allArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
] as const

export const allSens = ["cible", "source"] as const

export const idRegExp =
  /^(CNIL|DOLE|JORF|KALI|LEGI)(ARTI|CONT|SCTA|TEXT)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/
