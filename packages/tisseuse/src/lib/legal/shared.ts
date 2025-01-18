export type Sens = (typeof allSens)[number]

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

export interface SectionTaGitDb {
  id: string
  date: string
  path: string
}

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

export const allSens = ["cible", "source"] as const
