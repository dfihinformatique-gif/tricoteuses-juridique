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
  CONTEXTE: Contexte
  VERSIONS: {
    VERSION: Array<{
      "@etat": Etat
      LIEN_ART: LienArt
    }>
  }
  BLOC_TEXTUEL: {
    CONTENU: string // HTML
  }
}

export interface Contexte {
  TEXTE: {
    TITRE_TXT: TitreTxt | TitreTxt[]
  }
}

export interface DossierLegislatif {
  META: {
    META_COMMUN: MetaCommun
    META_DOSSIER_LEGISLATIF: {
      TITRE: string
    }
  }
}

export type Etat = "MODIFIE" | "VIGUEUR"

export interface IdWrapper {
  eli: string
  id: string
}

export interface Jo {
  META: {
    META_SPEC: {
      META_CONTENEUR: {
        NUM: string
        TITRE: string
        DATE_PUBLI: string
      }
    }
    META_COMMUN: MetaCommun
  }
}

export type LegalObject =
  | Article
  | DossierLegislatif
  | IdWrapper
  | Jo
  | SectionTa
  | Textelr
  | TexteVersion
  | VersionsWrapper

export type LegalObjectType =
  | "article"
  | "dossier_legislatif"
  | "id"
  | "jo"
  | "section_ta"
  | "texte_version"
  | "textelr"
  | "versions"

export interface LienArt {
  "@id": string
  "@fin": string
  "@num": string
  "@etat": Etat
  "@debut": string
  "@origine": "LEGI"
}

export interface MetaCommun {
  ID: string
}

export interface SectionTa {
  ID: string
  CONTEXTE: Contexte
  TITRE_TA: string
  STRUCTURE_TA: { LIEN_ART?: LienArt | LienArt[] }
}

export interface Textelr {
  META: {
    META_COMMUN: MetaCommun
  }
}

export interface TexteVersion {
  META: {
    META_SPEC: {
      META_TEXTE_VERSION: {
        TITRE: string
        TITREFULL: string
      }
    }
    META_COMMUN: MetaCommun
  }
}

export interface TitreTxt {
  "@fin": string
  "@debut": string
  "@id_txt": string
  "@c_titre_court": string
  "#text": string
}

export interface Versions {
  VERSION: {
    "@id": string
    "@fin": "2999-01-01"
    "@etat": ""
    "@debut": "2999-01-01"
  }
}

export interface VersionsWrapper {
  eli: string
  versions: Versions
}

export interface XmlHeader {
  "@encoding": "UTF-8"
  "@version": "1.0"
}

export function assertNeverLegalObjectType(type: never): never {
  throw `Unexpected type for legal object: ${type}`
}

export function bestItemForDate<T extends { "@debut": string; "@fin": string }>(
  items: T | T[],
  date: string,
): T | undefined {
  if (!Array.isArray(items)) {
    // Singleton
    return items
  }
  for (const item of items) {
    if (item["@debut"] <= date && date <= item["@fin"]) {
      return item
    }
  }
  return items[0]
}

export function pathnameFromLegalObject(
  type: LegalObjectType,
  object: LegalObject,
): string {
  switch (type) {
    case "article":
      return `/article/${(object as Article).META.META_COMMUN.ID}`
    case "dossier_legislatif":
      return `/dossier_legislatif/${
        (object as DossierLegislatif).META.META_COMMUN.ID
      }`
    case "id":
      return `/id/${(object as IdWrapper).eli}`
    case "jo":
      return `/jo/${(object as Jo).META.META_COMMUN.ID}`
    case "section_ta":
      return `/section_ta/${(object as SectionTa).ID}`
    case "texte_version":
      return `/texte_version/${(object as TexteVersion).META.META_COMMUN.ID}`
    case "textelr":
      return `/textelr/${(object as Textelr).META.META_COMMUN.ID}`
    case "versions":
      return `/versions/${(object as VersionsWrapper).eli}`
    default:
      assertNeverLegalObjectType(type)
  }
}

export function pathnameFromLegalObjectId(
  type: LegalObjectType,
  id: string,
): string {
  switch (type) {
    case "article":
      return `/article/${id}`
    case "dossier_legislatif":
      return `/dossier_legislatif/${id}`
    case "id":
      // Here, id is an ELI.
      return `/id/{id}`
    case "jo":
      return `/jo/${id}`
    case "section_ta":
      return `/section_ta/${id}`
    case "texte_version":
      return `/texte_version/${id}`
    case "textelr":
      return `/textelr/${id}`
    case "versions":
      // Here, id is an ELI.
      return `/versions/${id}`
    default:
      assertNeverLegalObjectType(type)
  }
}
