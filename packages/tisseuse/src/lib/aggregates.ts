import type { DossierLegislatif } from "$lib/legal/dole.js"
import type {
  Article,
  Idcc,
  SectionTa,
  Textekali,
  Textelr,
  TexteVersion,
  Versions,
} from "$lib/legal/index.js"
import type { Jo, JorfArticle } from "$lib/legal/jorf.js"
import type { LegiArticle } from "$lib/legal/legi.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"

export interface Aggregate {
  article?: { [id: string]: Article | JorfArticle | LegiArticle }
  article_lien?: ArticleLienDb[]
  dossier_legislatif?: { [id: string]: DossierLegislatif }
  id?: string
  idcc?: { [id: string]: Idcc }
  ids?: string[]
  jo?: { [id: string]: Jo }
  section_ta?: { [id: string]: SectionTa }
  texte_version?: { [id: string]: TexteVersion }
  texte_version_lien?: TexteVersionLienDb[]
  textekali?: { [id: string]: Textekali }
  textelr?: { [id: string]: Textelr }
  versions?: { [eli: string]: Versions }
}

export type Follow = (typeof allFollows)[number]

export interface GetArticleResult extends Aggregate {
  follow: Follow[]
  id: string
}

export interface GetRechercheResult extends Aggregate {
  follow: Follow[]
  id?: string
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
  nature?: string
  offset: number
  q?: string
}

export const allFollows = [
  "LIENS.LIEN[@sens=cible,@typelien=CREATION].@id",
  "STRUCT.LIEN_ART.@id",
  "STRUCT.LIEN_SECTION_TA.@id",
  "STRUCTURE_TA.LIEN_ART.@id",
  "STRUCTURE_TA.LIEN_SECTION_TA.@id",
  "TEXTEKALI",
  "TEXTELR",
] as const
