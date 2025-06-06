import type { MenuItem } from "@tricoteuses/explorer-tools"

import type { DossierLegislatif } from "./dole.js"
import type {
  Jo,
  JorfArticleTm,
  JorfSectionTa,
  JorfSectionTaLienArt,
  JorfSectionTaLienSectionTa,
  JorfSectionTaStructure,
  JorfSectionTaTm,
  JorfTextelr,
} from "./jorf.js"
import type {
  LegiArticleTm,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiSectionTaTm,
  LegiTextelr,
} from "./legi.js"

/**

* @ignore
 */
export interface Article {
  META: {
    META_COMMUN: MetaCommun
    META_SPEC: {
      META_ARTICLE: {
        NUM: string
        ETAT: Etat
        TYPE: "AUTONOME" | "ENTIEREMENT_MODIF" | "PARTIELLEMENT_MODIF"
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
  BLOC_TEXTUEL?: {
    CONTENU: string // HTML
  }
}

/**
 * @ignore
 */
export interface ArticleVersion {
  "@etat": Etat
  LIEN_ART: LienArt
}

/**
 * @ignore
 */
export interface Contexte {
  TEXTE: {
    "@cid": string
    "@nor": string
    "@num": string
    "@nature": Nature
    "@autorite": string
    "@ministere": string
    "@date_publi": string
    "@date_signature": string
    "@num_parution_jo": string
    TITRE_TXT?: TitreTxt | TitreTxt[]
  }
}

/**
 * @ignore
 */
export type Etat =
  | ""
  | "ABROGE_DIFF"
  | "ABROGE"
  | "ANNULE"
  | "DENONCE"
  | "DEPLACE"
  | "DISJOINT"
  | "MODIFIE_MORT_NE"
  | "MODIFIE"
  | "PERIME"
  | "REMPLACE"
  | "TRANSFERE"
  | "VIGUEUR_DIFF"
  | "VIGUEUR_ETEN"
  | "VIGUEUR_NON_ETEN"
  | "VIGUEUR"

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export interface IdWrapper {
  eli: string
  id: string
}

/**
 * @ignore
 */
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

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export interface Lien {
  "@id": string
  "@num": string
  "@sens": "cible" | "source"
  "@cidtexte": string
  "@nortexte": string
  "@numtexte": string
  "@typelien":
    | "ABROGATION"
    | "ABROGE"
    | "ADHERE"
    | "ANNULATION"
    | "ANNULE"
    | "APPLICATION"
    | "CITATION"
    | "CODIFICATION"
    | "CONCORDANCE"
    | "CONCORDE"
    | "CREATION"
    | "CREE"
    | "DENONCE"
    | "DENONCIATION"
    | "DEPLACE"
    | "DEPLACEMENT"
    | "DISJOINT"
    | "DISJONCTION"
    | "ELARGISSEMENT"
    | "EXTENSION"
    | "HISTO"
    | "MODIFICATION"
    | "MODIFIE"
    | "PEREMPTION"
    | "PERIME"
    | "RATIFICATION"
    | "RATIFIE"
    | "RATTACHEMENT"
    | "RECTIFICATION"
    | "SPEC_APPLI"
    | "TRANSFERE"
    | "TRANSFERT"
    | "TXT_ASSOCIE"
    | "TXT_SOURCE"
  "@naturetexte": Nature
  "@datesignatexte": string
  "#text": string
}

/**
 * @ignore
 */
export interface LienArt {
  "@id": string
  "@fin": string
  "@num": string
  "@etat": Etat
  "@debut": string
  "@origine": Origine
}

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export interface MetaCommun {
  ID: string
  URL: string
  NATURE: Nature
  ORIGINE: Origine
  ANCIEN_ID: string
}

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export type Nature =
  | ""
  | "ACCORD COLLECTIF NATIONAL"
  | "ACCORD COLLECTIF"
  | "Accord de branche"
  | "ACCORD DE BRANCHE"
  | "Accord de champ"
  | "Accord de méthode"
  | "Accord de substitution"
  | "ACCORD INTERBRANCHE"
  | "Accord interbranches"
  | "ACCORD INTERBRANCHES"
  | "ACCORD INTERPROFESSIONNEL"
  | "Accord multibranches"
  | "Accord national interprofessionnel"
  | "ACCORD NATIONAL PARITAIRE"
  | "ACCORD NATIONAL PLURIPROFESSIONNEL"
  | "ACCORD NATIONAL PROFESSIONNEL"
  | "Accord national"
  | "ACCORD NATIONAL"
  | "Accord paritaire"
  | "ACCORD PROFESSIONNEL INTER-SECTEURS"
  | "Accord professionnel"
  | "ACCORD PROFESSIONNEL"
  | "Accord-cadre de convergence"
  | "Accord-cadre interbranches"
  | "Accord-cadre"
  | "ACCORD-CADRE"
  | "accord"
  | "Accord"
  | "ACCORD"
  | "Additif"
  | "Adhésion par lettre"
  | "ANNEXE PARTICULIERE"
  | "annexe"
  | "Annexe"
  | "ANNEXE"
  | "ANNEXES"
  | "ARRETE"
  | "avenant"
  | "Avenant"
  | "AVENANT"
  | "Avis d'interprétation"
  | "avis interprétatif"
  | "Avis interprétatif"
  | "AVIS"
  | "CIRCULAIRE"
  | "CODE"
  | "CONSTAT D'ACCORD"
  | "CONSTITUTION"
  | "Convention collective départementale"
  | "CONVENTION COLLECTIVE INTERREGIONALE"
  | "Convention collective interrégionale"
  | "Convention collective nationale de la branche ferroviaire"
  | "Convention collective nationale"
  | "CONVENTION COLLECTIVE NATIONALE"
  | "Convention collective régionale"
  | "convention collective"
  | "Convention collective"
  | "CONVENTION COLLECTIVE"
  | "Convention"
  | "DECISION"
  | "DECRET_LOI"
  | "DECRET"
  | "DELIBERATION"
  | "Dénonciation par lettre"
  | "Dénonciation"
  | "DIRECTIVE_EURO"
  | "Lettre"
  | "LOI_CONSTIT"
  | "LOI_ORGANIQUE"
  | "LOI_PROGRAMME"
  | "LOI"
  | "ORDONNANCE"
  | "Procès-verbal de désaccord"
  | "PROTOCOLE D'ACCORD COLLECTIF"
  | "PROTOCOLE D'ACCORD INTERBRANCHE"
  | "Protocole d'accord"
  | "PROTOCOLE D'ACCORD"
  | "Protocole"
  | "PROTOCOLE"
  | "RAPPORT"
  | "Recommandation patronale"
  | "Rectificatif"

/**
 * @ignore
 */
export type Origine = "JORF" | "KALI" | "LEGI"

/**
 * @ignore
 */
export interface SectionTa {
  ID: string
  CONTEXTE: Contexte
  TITRE_TA: string
  STRUCTURE_TA?: {
    LIEN_ART?: LienArt | LienArt[]
    LIEN_SECTION_TA?: LienSectionTa | LienSectionTa[]
  }
}

/**
 * @ignore
 */
export type Textekali = Textelr

/**
 * Racine de l'arborescence d'un texte législatif ou règlementaire
 * @ignore
 */
export interface Textelr {
  META: {
    META_COMMUN: MetaCommun
    META_SPEC: {
      META_TEXTE_CHRONICLE: MetaTexteChronicle
    }
  }
  STRUCT?: {
    LIEN_ART?: LienArt | LienArt[]
    LIEN_SECTION_TA?: LienSectionTa | LienSectionTa[]
  }
  VERSIONS: {
    VERSION: TextelrVersion | TextelrVersion[]
  }
}

/**
 * @ignore
 */
export interface TextelrVersion {
  "@etat": Etat
  LIEN_TXT: TextelrVersionLienTxt
}

/**
 * @ignore
 */
export interface TextelrVersionLienTxt {
  "@id": string
  "@fin": string
  "@num": string
  "@debut": string
}

/**
 * @ignore
 */
export interface TexteVersion {
  ABRO?: {
    CONTENU: string
  }
  META: {
    META_SPEC: {
      META_TEXTE_CHRONICLE: MetaTexteChronicle
      META_TEXTE_VERSION: {
        TITRE?: string
        TITREFULL?: string
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
  // Travaux préparatoires
  TP?: {
    CONTENU: string
  }
  VISAS?: {
    CONTENU: string
  }
}

/**
 * @ignore
 */
export interface TitreTm {
  "#text": string
  "@debut": string
  "@fin": string
  "@id": string
}

/**
 * @ignore
 */
export interface TitreTxt {
  "#text": string
  "@c_titre_court": string
  "@debut": string
  "@fin": string
  "@id_txt": string
}

/**
 * Table des matières (TM)
 * @ignore
 */
export interface Tm {
  "@niv": string // 1, 2, 3…
  LIEN_TXT?: TmLienTxt | TmLienTxt[]
  TITRE_TM: string
  TM?: Tm | Tm[]
}

/**
 * @ignore
 */
export interface TmLienTxt {
  "@idtxt": string
  "@titretxt": string
}

/**
 * @ignore
 */
export interface Versions {
  VERSION: {
    "@id": string
    "@fin": "2999-01-01"
    "@etat": ""
    "@debut": "2999-01-01"
  }
}

/**
 * @ignore
 */
export interface VersionsWrapper {
  eli: string
  versions: Versions
}

/**
 * @ignore
 */
export interface XmlHeader {
  "@encoding": "UTF-8"
  "@version": "1.0"
}

/**
 * @ignore
 */
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

/**
 * @ignore
 */
export function assertNeverLegalObjectType(type: never): never {
  throw `Unexpected type for legal object: ${type}`
}

export function bestItemForDate<T extends { "@debut": string; "@fin": string }>(
  items: T | T[] | undefined | null,
  date: string,
): T | undefined {
  if (items == null) {
    return undefined
  }
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

export function legifranceUrlFromLegalObject(
  type: LegalObjectType,
  object: LegalObject,
): string {
  switch (type) {
    case "article":
      return `https://www.legifrance.gouv.fr/codes/article_lc/${
        (object as Article).META.META_COMMUN.ID
      }`
    case "dossier_legislatif":
    case "id":
    case "idcc":
    case "jo":
    case "section_ta":
    case "texte_version":
    case "textekali":
    case "textelr":
    case "versions":
      return "TODO"
    default:
      assertNeverLegalObjectType(type)
  }
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
    case "article":
      return [
        { href: `/articles/${id}`, label: "Présentation" },
        { href: `/article/${id}`, label: "ARTICLE" },
      ]
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

/**
 * @ignore
 */
export function pathnameFromLegalId(id: string): string | undefined {
  const rootType = rootTypeFromLegalId(id)
  if (rootType === undefined) {
    return undefined
  }
  if (rootType === "article") {
    return `/articles/${id}`
  }
  if (["texte_version", "textekali", "textelr"].includes(rootType)) {
    return `/textes/${id}`
  }
  return `/${rootType}/${id}`
}

/**
 * @ignore
 */
export function pathnameFromLegalObject(
  type: LegalObjectType,
  object: LegalObject,
): string {
  switch (type) {
    case "article":
      // return `/article/${(object as Article).META.META_COMMUN.ID}`
      return `/articles/${(object as Article).META.META_COMMUN.ID}`
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

/**
 * @ignore
 */
export function pathnameFromLegalObjectTypeAndId(
  type: LegalObjectType,
  id: string,
): string {
  switch (type) {
    case "article":
      // return `/article/${id}`
      return `/articles/${id}`
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

/**
 * @ignore
 */
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

export function* walkContexteTexteTm(
  tm: JorfArticleTm | JorfSectionTaTm | LegiArticleTm | LegiSectionTaTm,
): Generator<
  JorfArticleTm | JorfSectionTaTm | LegiArticleTm | LegiSectionTaTm,
  void
> {
  yield tm
  if (tm.TM !== undefined) {
    yield* walkContexteTexteTm(tm.TM)
  }
}

export async function* walkStructureTree(
  getSectionTa: (
    sectionTaId: string,
  ) => Promise<JorfSectionTa | LegiSectionTa | null>,
  structure: JorfSectionTaStructure | LegiSectionTaStructure,
  parentsSectionTa: Array<JorfSectionTa | LegiSectionTa> = [],
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
      const childSectionTa = await getSectionTa(lienSectionTa["@id"])
      if (childSectionTa != null) {
        yield {
          lienSectionTa,
          liensSectionTa,
          parentsSectionTa,
          sectionTa: childSectionTa,
        }
        const childStructure = childSectionTa.STRUCTURE_TA
        if (childStructure !== undefined) {
          yield* walkStructureTree(getSectionTa, childStructure, [
            ...parentsSectionTa,
            childSectionTa,
          ])
        }
      }
    }
  }
}

export async function* walkTextelrLiensArticles(
  getSectionTa: (
    sectionTaId: string,
  ) => Promise<JorfSectionTa | LegiSectionTa | null>,
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
    getSectionTa,
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
