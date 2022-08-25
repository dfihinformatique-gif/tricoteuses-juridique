import type { Article, SectionTa, Textelr, TexteVersion } from "$lib/legal"

export interface Aggregate {
  article?: { [id: string]: Article }
  id?: string
  ids?: string[]
  section_ta?: { [id: string]: SectionTa }
  texte_version?: { [id: string]: TexteVersion }
  textelr?: { [id: string]: Textelr }
}

export type Follow = typeof allFollows[number]

export interface GetRechercheResult extends Aggregate {
  follow: Follow[]
  id: string
  q?: string
}

export interface GetTexteResult extends Aggregate {
  follow: Follow[]
  id: string
}

export interface ListTextesResult extends Aggregate {
  follow: Follow[]
  ids: string[]
  limit: number
  offset: number
  q?: string
}

export const allFollows = [
  "LIENS.LIEN[@sens=cible,@typelien=CREATION].@id",
  "STRUCT.LIEN_ART.@id",
  "STRUCT.LIEN_SECTION_TA.@id",
  "STRUCTURE_TA.LIEN_ART.@id",
  "STRUCTURE_TA.LIEN_SECTION_TA.@id",
  "TEXTELR",
] as const
export const allFollowsMutable = [...allFollows]
