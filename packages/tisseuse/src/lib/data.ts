export interface Article {
  META: {
    META_COMMUN: MetaCommun
    META_SPEC: {
      META_ARTICLE: {
        NUM: string
        ETAT: Etat
        TYPE: "AUTONOME"
        DATE_FIN: string
        DATE_DEBUT: string
      }
    }
  }
  CONTEXTE: {
    TEXTE: {
      TITRE_TXT: TitreTexte | TitreTexte[]
    }
  }
  VERSIONS: {
    VERSION: Array<{
      "@etat": Etat
      LIEN_ART: {
        "@id": string
        "@fin": string
        "@num": string
        "@etat": Etat
        "@debut": string
        "@origine": "LEGI"
      }
    }>
  }
  BLOC_TEXTUEL: {
    CONTENU: string // HTML
  }
}

export type EliId = string

export interface EliVersions {}

export type Etat = "MODIFIE" | "VIGUEUR"
export type LegiObject =
  | Article
  | EliId
  | EliVersions
  | Section
  | Struct
  | Version

export type LegiObjectType =
  | "article"
  | "eli_id"
  | "eli_versions"
  | "sections"
  | "struct"
  | "version"

export interface MetaCommun {
  ID: string
}

export interface Section {
  ID: string
}

export interface Struct {
  META: {
    META_COMMUN: MetaCommun
  }
}

export interface TitreTexte {
  "#text": string
}

export interface Version {
  META: {
    META_COMMUN: MetaCommun
  }
}

export function assertNeverLegiObjectType(type: never): never {
  throw `Unexpected type for LEGI object: ${type}`
}

export function pathnameFromLegiObject(
  type: LegiObjectType,
  object: LegiObject,
): string {
  switch (type) {
    case "article":
      return `/articles/${(object as Article).META.META_COMMUN.ID}`
    case "eli_id":
      return `/eli/ids/TODO`
    case "eli_versions":
      return `/eli/ids/TODO`
    case "sections":
      return `/sections/${(object as Section).ID}`
    case "struct":
      return `/structs/${(object as Struct).META.META_COMMUN.ID}`
    case "version":
      return `/versions/${(object as Version).META.META_COMMUN.ID}`
    default:
      assertNeverLegiObjectType(type)
  }
}

export function pathnameFromLegiObjectId(
  type: LegiObjectType,
  id: string,
): string {
  switch (type) {
    case "article":
      return `/articles/${id}`
    case "eli_id":
      return `/eli/ids/TODO`
    case "eli_versions":
      return `/eli/ids/TODO`
    case "sections":
      return `/sections/${id}`
    case "struct":
      return `/structs/${id}`
    case "version":
      return `/versions/${id}`
    default:
      assertNeverLegiObjectType(type)
  }
}
