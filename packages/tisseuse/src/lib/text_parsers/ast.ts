import { assertNever } from "$lib/asserts.js"

export type CompoundReferencesSeparator =
  (typeof compoundReferencesSeparators)[number]

export type DivisionType = (typeof divisionTypes)[number]

export type EuropeanLawNature = (typeof europeanLawNatures)[number]

export type FrenchLawNature = (typeof frenchLawNatures)[number]

export type InternationalLawNature = (typeof internationalLawNatures)[number]

export type LawNature = (typeof lawNatures)[number]

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
  | TextAstLocalization
  | TextAstNumber
  | TextAstPosition
  | TextAstReference
  | TextAstText
  | TextAstTextIdentification
  | TextAstTextInfos
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
  implicitText?: TextAstText | undefined
  localization?: TextAstLocalization
  localizationAdverb?: LocalizationAdverb
  num?: string
  ofTheSaid?: boolean
  type: "article"
} & TextAstPosition

export type TextAstAtomicReference =
  | TextAstArticle
  | TextAstDivision
  | TextAstIncompleteHeader
  | TextAstPortion
  | (TextAstText & TextAstPosition)

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
  num: string
  type: "décision du Conseil constitutionnel"
} & TextAstPosition

export type TextAstCountedInterval = {
  count: number
  first: TextAstReference
  type: "counted-interval"
} & TextAstPosition

export type TextAstDivision = {
  index?: number
  localization?: TextAstLocalization
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
  num?: string
  localization?: TextAstLocalization
  localizationAdverb?: LocalizationAdverb
  ofTheSaid?: boolean
  type: "incomplete-header"
} & TextAstPosition

export type TextAstLocalization =
  | TextAstLocalizationAbsolute
  | TextAstLocalizationRelative

export type TextAstLocalizationAbsolute = { absolute: number }

export type TextAstLocalizationRelative = { relative: number | "+∞" }

export type TextAstNumber = {
  text: string
  value: number
} & TextAstPosition

export type TextAstParentChild = {
  child: TextAstReference
  parent: TextAstAtomicReference
  type: "parent-enfant"
} & TextAstPosition

export type TextAstPortion = {
  index?: number
  localization?: TextAstLocalization
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

export interface TextAstText {
  /**
   * For the texts found in the Légifrance datasets, this is
   * Légifrance CID of the text.
   */
  cid?: string
  date?: string
  nature: LawNature
  legislation?: "international" | "UE"
  localization?: TextAstLocalization
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
  type: "texte"
}

export interface TextAstTextIdentification {
  date?: string
  /**
   * For the texts found in the Légifrance datasets, this is
   * Légifrance NUM of the text (for example the number of the law).
   */
  num?: string
}

export interface TextAstTextInfos {
  cid: string | string[]
}

export type TextInfosByWordsTree = TextAstTextInfos & {
  [word: string]: TextInfosByWordsTree
}

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

export const europeanLawNatures = [
  "DIRECTIVE_EURO",
  "REGLEMENTEUROPEEN",
] as const

export const frenchLawNatures = [
  "ARRETE",
  "CIRCULAIRE",
  "CODE",
  "CONSTITUTION",
  "DECRET",
  "DECRET_LOI",
  "LOI",
  "LOI_CONSTIT",
  "LOI_ORGANIQUE",
  "ORDONNANCE",
] as const

export const internationalLawNatures = ["CONVENTION"] as const

export const divisionTypes = [
  "livre",
  "titre",
  "chapitre",
  "section",
  "sous-section",
  "paragraphe",
  "sous-paragraphe",
] as const

export const lawNatures = [
  ...europeanLawNatures,
  ...frenchLawNatures,
  ...internationalLawNatures,
] as const

export const portionTypes = ["partie", "alinéa", "phrase"] as const

export const localizationAdverbs = [
  "après",
  "avant",
  "dessous",
  "dessus",
] as const

export function isTextAstAtomicReference(
  reference: TextAstReference,
): reference is TextAstAtomicReference {
  switch (reference.type) {
    case "alinéa":
    case "article":
    case "chapitre":
    case "incomplete-header":
    case "livre":
    case "paragraphe":
    case "partie":
    case "phrase":
    case "section":
    case "sous-paragraphe":
    case "sous-section":
    case "texte":
    case "titre":
      return true

    case "bounded-interval":
    case "counted-interval":
    case "enumeration":
    case "exclusion":
    case "parent-enfant":
    case "reference_et_action":
      return false

    default:
      assertNever("isTextAstAtomicReference", reference)
  }
}

export function isTextAstDivision(
  reference: TextAstReference,
): reference is TextAstDivision {
  return divisionTypes.includes(reference.type as DivisionType)
}

export function isTextAstPortion(
  reference: TextAstReference,
): reference is TextAstPortion {
  return portionTypes.includes(reference.type as PortionType)
}
