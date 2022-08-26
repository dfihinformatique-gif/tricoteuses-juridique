import type { MenuItem } from "@tricoteuses/explorer-tools"

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
  NOTA: {
    CONTENU: string
  }
  LIENS?: {
    LIEN: Lien | Lien
  }
  CONTEXTE: Contexte
  VERSIONS: {
    VERSION: ArticleVersion | ArticleVersion[]
  }
  BLOC_TEXTUEL: {
    CONTENU: string // HTML
  }
}

export interface ArticleVersion {
  "@etat": Etat
  LIEN_ART: LienArt
}

export interface Contexte {
  TEXTE: {
    "@cid": string
    "@nor": string
    "@num": string
    "@nature": string
    "@autorite": string
    "@ministere": string
    "@date_publi": string
    "@date_signature": string
    "@num_parution_jo": string
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

export type Etat = "" | "MODIFIE" | "PERIME" | "VIGUEUR"

export interface Idcc {
  META: {
    META_COMMUN: MetaCommun
    META_SPEC: {
      META_CONTENEUR: {
        TITRE: string
        ETAT: Etat
        NUM: string
        DATE_PUBLI: string
      }
    }
  }
}

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
  STRUCTURE_TXT: {
    TM: Tm
  }
}

export type LegalObject =
  | Article
  | DossierLegislatif
  | Idcc
  | IdWrapper
  | Jo
  | SectionTa
  | Textekali
  | Textelr
  | TexteVersion
  | VersionsWrapper

export type LegalObjectType =
  | "article"
  | "dossier_legislatif"
  | "id"
  | "idcc"
  | "jo"
  | "section_ta"
  | "texte_version"
  | "textekali"
  | "textelr"
  | "versions"

export interface Lien {
  "@id": string
  "@num": string
  "@sens": "cible" | "source"
  "@cidtexte": string
  "@nortexte": string
  "@numtexte": string
  "@typelien": "CITATION" | "CODIFICATION" | "CREATION" | "SPEC_APPLI"
  "@naturetexte": string
  "@datesignatexte": string
  "#text": string
}

export interface LienArt {
  "@id": string
  "@fin": string
  "@num": string
  "@etat": Etat
  "@debut": string
  "@origine": "LEGI"
}

export interface LienSectionTa {
  "@id": string
  "@cid": string
  "@fin": string
  "@niv": string
  "@url": string
  "@etat": Etat
  "@debut": string
  "#text": string
}

export interface MetaCommun {
  ID: string
  URL: string
  NATURE: string
  ORIGINE: string
  ANCIEN_ID: string
}

export interface MetaTexteChronicle {
  CID: string
  NUM: string
  NUM_PARUTION: string
  NUM_SEQUENCE: number
  NOR: string
  DATE_PUBLI: string
  DATE_TEXTE: string
  DERNIERE_MODIFICATION: string
  ORIGINE_PUBLI: string
  PAGE_DEB_PUBLI: number
  PAGE_FIN_PUBLI: number
  VERSIONS_A_VENIR?: string
}

export interface SectionTa {
  ID: string
  CONTEXTE: Contexte
  TITRE_TA: string
  STRUCTURE_TA: {
    LIEN_ART?: LienArt | LienArt[]
    LIEN_SECTION_TA?: LienSectionTa | LienSectionTa[]
  }
}

export type Textekali = Textelr

/// Racine de l'arborescence d'un texte législatif ou règlementaire
export interface Textelr {
  META: {
    META_COMMUN: MetaCommun
    META_SPEC: {
      META_TEXTE_CHRONICLE: MetaTexteChronicle
    }
  }
  STRUCT: {
    LIEN_ART?: LienArt | LienArt[]
    LIEN_SECTION_TA?: LienSectionTa | LienSectionTa[]
  }
  VERSIONS: {
    VERSION: TextelrVersion | TextelrVersion[]
  }
}

export interface TextelrVersion {
  "@etat": Etat
  LIEN_TXT: TextelrVersionLienTxt
}

export interface TextelrVersionLienTxt {
  "@id": string
  "@fin": string
  "@num": string
  "@debut": string
}

export interface TexteVersion {
  ABRO?: {
    CONTENU: string
  }
  META: {
    META_SPEC: {
      META_TEXTE_CHRONICLE: MetaTexteChronicle
      META_TEXTE_VERSION: {
        TITRE: string
        TITREFULL: string
      }
    }
    META_COMMUN: MetaCommun
  }
  NOTA?: {
    CONTENU: string
  }
  NOTICE?: {
    CONTENU: string
  }
  RECT?: {
    CONTENU: string
  }
  SIGNATAIRES?: {
    CONTENU: string
  }
  SM?: {
    CONTENU: string
  }
  TP?: {
    CONTENU: string
  }
  VISAS?: {
    CONTENU: string
  }
}

export interface TitreTm {
  "@id": string
  "@fin": string
  "#text": string
  "@debut": string
}

export interface TitreTxt {
  "@fin": string
  "@debut": string
  "@id_txt": string
  "@c_titre_court": string
  "#text": string
}

/// Table des matières (TM)
export interface Tm {
  "@niv": string // 1, 2, 3…
  LIEN_TXT?: TmLienTxt | TmLienTxt[]
  TITRE_TM: string
  TM?: Tm | Tm[]
}

export interface TmLienTxt {
  "@idtxt": string
  "@titretxt": string
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

export const appMenu: MenuItem[] = [
  { href: "/recherche", label: "Recherche" },
  {
    items: [
      { href: "/idcc", label: "Accords de branche et conventions collectives" },
      { href: "/textes", label: "Codes, lois et règlements" },
      { href: "/dossier_legislatif", label: "Dossiers législatifs" },
      { href: "/jo", label: "Journal officiel" },
    ],
    label: "Fonds",
  },
  {
    items: [
      { href: "/article", label: "ARTICLE" },
      { href: "/dossier_legislatif", label: "DOSSIER_LEGISLATIF" },
      { href: "/id", label: "ID" },
      { href: "/idcc", label: "IDCC" },
      { href: "/jo", label: "JO" },
      { href: "/section_ta", label: "SECTION_TA" },
      { href: "/texte_version", label: "TEXTE_VERSION" },
      { href: "/textekali", label: "TEXTEKALI" },
      { href: "/textelr", label: "TEXTELR" },
      { href: "/versions", label: "VERSIONS" },
    ],
    label: "Données",
  },
  // {
  //   items: [
  //     { href: "/jo", label: "JO" },
  //   ],
  //   label: "JORF",
  //   title: "Textes publiés au Journal officiel de la République française",
  // },
  // {
  //   items: [
  //     { href: "/article", label: "ARTICLE" },
  //     // { href: "/eli/ids", label: "ID" },
  //     { href: "/section_ta", label: "SECTION_TA" },
  //     { href: "/texte_version", label: "TEXTE_VERSION" },
  //     { href: "/textelr", label: "TEXTELR" },
  //     // { href: "/eli/versions", label: "VERSIONS" },
  //   ],
  //   label: "LEGI",
  //   title: "Codes, lois et règlements consolidés",
  // },
]

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

export function menuItemsFromLegalId(
  id: string | undefined | null,
): MenuItem[] | undefined {
  if (id == null) {
    return undefined
  }
  const rootType = rootTypeFromLegalId(id)
  if (rootType === undefined) {
    return undefined
  }
  switch (rootType) {
    case "texte_version":
      return [
        { href: `/textes/${id}`, label: "Présentation" },
        { href: `/texte_version/${id}`, label: "TEXTE_VERSION" },
        id.startsWith("KALI")
          ? { href: `/textekali/${id}`, label: "TEXTEKALI" }
          : { href: `/textelr/${id}`, label: "TEXTELR" },
      ]
    default:
      return undefined
  }
}

export function pathnameFromLegalId(id: string): string | undefined {
  const rootType = rootTypeFromLegalId(id)
  if (rootType === undefined) {
    return undefined
  }
  if (["texte_version", "textekali", "textelr"].includes(rootType)) {
    return `/textes/${id}`
  }
  return `/${rootType}/${id}`
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
    case "idcc":
      return `/idcc/${(object as Idcc).META.META_COMMUN.ID}`
    case "jo":
      return `/jo/${(object as Jo).META.META_COMMUN.ID}`
    case "section_ta":
      return `/section_ta/${(object as SectionTa).ID}`
    case "texte_version":
      // return `/texte_version/${(object as TexteVersion).META.META_COMMUN.ID}`
      return `/textes/${(object as TexteVersion).META.META_COMMUN.ID}`
    case "textekali":
      // return `/textekali/${(object as Textekali).META.META_COMMUN.ID}`
      return `/textes/${(object as TexteVersion).META.META_COMMUN.ID}`
    case "textelr":
      // return `/textelr/${(object as Textelr).META.META_COMMUN.ID}`
      return `/textes/${(object as TexteVersion).META.META_COMMUN.ID}`
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
    case "idcc":
      return `/idcc/${id}`
    case "jo":
      return `/jo/${id}`
    case "section_ta":
      return `/section_ta/${id}`
    case "texte_version":
      // return `/texte_version/${id}`
      return `/textes/${id}`
    case "textekali":
      // return `/textekali/${id}`
      return `/textes/${id}`
    case "textelr":
      // return `/textelr/${id}`
      return `/textes/${id}`
    case "versions":
      // Here, id is an ELI.
      return `/versions/${id}`
    default:
      assertNeverLegalObjectType(type)
  }
}

export function rootTypeFromLegalId(id: string): LegalObjectType | undefined {
  if (!id) {
    return undefined
  }
  if (id.match(/^[A-Z]{4}ARTI/) !== null) {
    return "article"
  }
  if (id.match(/^[A-Z]{4}DOLE/) !== null) {
    return "dossier_legislatif"
  }
  if (id.match(/^KALICONT/) !== null) {
    return "idcc"
  }
  if (id.match(/^JORFCONT/) !== null) {
    return "jo"
  }
  if (id.match(/^[A-Z]{4}SCTA/) !== null) {
    return "section_ta"
  }
  if (id.match(/^[A-Z]{4}TEXT/) !== null) {
    return "texte_version"
  }
  throw new Error(`Unexpected legal ID: "${id}"`)
}
