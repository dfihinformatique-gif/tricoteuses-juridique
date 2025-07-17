export type CompoundReferencesSeparator =
  (typeof compoundReferencesSeparators)[number]

export type DivisionType = (typeof divisionTypes)[number]

export type EuropeanLawType = (typeof europeanLawTypes)[number]

export type FrenchLawType = (typeof frenchLawTypes)[number]

export type InternationalLawType = (typeof internationalLawTypes)[number]

export type LawType = (typeof lawTypes)[number]

export type LocalizationAdverb = (typeof localizationAdverbs)[number]

export type PortionType = (typeof portionTypes)[number]

export type TextAst =
  | boolean
  | null
  | number
  | string
  | TextAstAction
  | TextAstArticle
  | TextAstBoundedInterval
  | TextAstCitation
  | TextAstLaw
  | TextAstLawIdentification
  | TextAstLocalisation
  | TextAstNombre
  | TextAstPosition
  | TextAstReference
  | Array<TextAst>

export interface TextAstAction {
  action:
    | "CREATION"
    | "CREATION_OU_MODIFICATION"
    | "MODIFICATION"
    | "SUPPRESSION"
  actionInContent?: boolean
}

export type TextAstArticle = {
  id?: string
  localization?: TextAstLocalisation
  localizationAdverb?: LocalizationAdverb
  ofTheSaid?: boolean
  type: "article"
} & TextAstPosition

export type TextAstAtomicReference =
  | TextAstArticle
  | TextAstDivision
  | TextAstIncompleteHeader
  | (TextAstLaw & TextAstPosition)
  | TextAstPortion

export type TextAstBoundedInterval = {
  first: TextAstReference
  last: TextAstReference
  type: "bounded-interval"
} & TextAstPosition

export type TextAstCitation = {
  content: TextAstPosition[]
  type: "citation"
} & TextAstPosition

export type TextAstCompoundReference =
  | TextAstBoundedInterval
  | TextAstCountedInterval
  | TextAstEnumeration
  | TextAstExclusion

export type TextAstConseilConstitutionnelDecision = {
  id: string
  type: "décision du Conseil constitutionnel"
} & TextAstPosition

export type TextAstCountedInterval = {
  count: number
  first: TextAstReference
  type: "counted-interval"
} & TextAstPosition

export type TextAstDivision = {
  index?: number
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  type: DivisionType
} & TextAstPosition

export type TextAstEnumeration = {
  coordinator: "," | "et" | "ou"
  left: TextAstReference
  right: TextAstReference
  type: "enumeration"
} & TextAstPosition

export type TextAstExclusion = {
  left: TextAstReference
  right: TextAstReference
  type: "exclusion"
} & TextAstPosition

export type TextAstIncompleteHeader = {
  id?: string
  localization?: TextAstLocalisation
  localizationAdverb?: LocalizationAdverb
  ofTheSaid?: boolean
  type: "incomplete-header"
} & TextAstPosition

export interface TextAstLaw {
  /**
   * For the texts found in the Légifrance datasets, this is
   * Légifrance CID of the text.
   */
  cid?: string
  lawDate?: string
  lawType: LawType
  legislation?: "international" | "UE"
  localization?: TextAstLocalisation
  /**
   * For the texts found in the Légifrance datasets, this is
   * Légifrance NUM of the text (for example the number of the law).
   */
  num?: string
  ofTheSaid?: boolean
  /**
   * For the texts found in the Légifrance datasets, the title
   * is the Légifrance one ⇒ it may differ from the title given in
   * input.
   */
  title?: string
  type: "law"
}

export interface TextAstLawIdentification {
  lawDate?: string
  /**
   * For the texts found in the Légifrance datasets, this is
   * Légifrance NUM of the text (for example the number of the law).
   */
  num?: string
}

export type TextAstLocalisation =
  | { absolute: number }
  | { relative: number | "+∞" }

export type TextAstNombre = {
  id: string
  value: number
} & TextAstPosition

export type TextAstParentChild = {
  child: TextAstReference
  parent: TextAstReference
  type: "parent-enfant"
} & TextAstPosition

export type TextAstPortion = {
  index?: number
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  type: PortionType
} & TextAstPosition

export interface TextAstPosition {
  position: TextPosition
}

export type TextAstReference =
  | TextAstAtomicReference
  | TextAstCompoundReference
  // | TextAstConseilConstitutionnelDecision TODO
  | TextAstParentChild
  | TextAstReferenceAndAction

export type TextAstReferenceAndAction = {
  action: TextAstAction
  reference: TextAstReference
  type: "reference_et_action"
} & TextAstPosition

export interface TextPosition {
  start: number
  stop: number
}

export const compoundReferencesSeparators = [
  ",",
  "à",
  "et",
  "ou",
  "sauf",
] as const

export const europeanLawTypes = ["directive", "règlement"] as const

export const frenchLawTypes = [
  "arrêté",
  "circulaire",
  "code",
  "constitution",
  "décret",
  "décret-loi",
  "loi",
  "loi constitutionnelle",
  "loi organique",
  "ordonnance",
] as const

export const internationalLawTypes = ["convention"] as const

export const lawTypes = [
  ...europeanLawTypes,
  ...frenchLawTypes,
  ...internationalLawTypes,
] as const

export const divisionTypes = [
  "livre",
  "titre",
  "chapitre",
  "section",
  "sous-section",
  "paragraphe",
  "sous-paragraphe",
] as const

export const portionTypes = ["partie", "alinéa", "phrase"] as const

export const localizationAdverbs = [
  "après",
  "avant",
  "dessous",
  "dessus",
] as const
