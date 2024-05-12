export type Sens = (typeof allSens)[number]

export const allSens = ["cible", "source"] as const

export interface ArticleLienDb {
  article_id: string
  cible: boolean
  cidtexte: string | null
  id: string
  typelien: string
}

export interface TexteVersionLienDb {
  texte_version_id: string
  cible: boolean
  cidtexte: string | null
  id: string
  typelien: string
}
