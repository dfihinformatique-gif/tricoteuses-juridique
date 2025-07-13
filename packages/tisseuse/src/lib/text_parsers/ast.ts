export type DivisionType = (typeof divisionTypes)[number]

export type EuropeanLawType = (typeof europeanLawTypes)[number]

export type FrenchLawType = (typeof frenchLawTypes)[number]

export type InternationalLawType = (typeof internationalLawTypes)[number]

export type LawType = (typeof lawTypes)[number]

export type PortionType = (typeof portionTypes)[number]

export type TextAst =
  | boolean
  | null
  | number
  | string
  | TestAstAction
  | TextAstBoundedInterval
  | TextAstCitation
  | TextAstLaw
  | TextAstLawIdentification
  | TextAstLocalisation
  | TextAstNombre
  | TextAstPosition
  | TextAstReference
  | Array<TextAst>

export interface TestAstAction {
  action:
    | "CREATION"
    | "CREATION_OU_MODIFICATION"
    | "MODIFICATION"
    | "SUPPRESSION"
  actionInContent?: boolean
}

export type TextAstAtomicReference =
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

export type TextAstCountedInterval = {
  count: number
  first: TextAstReference
  type: "counted-interval"
} & TextAstPosition

export type TextAstDivision = {
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  order?: number
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
  adverb?: "après" | "avant" | "dessous" | "dessus"
  id?: string
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  type: "incomplete-header"
} & TextAstPosition

export interface TextAstLaw {
  child?: TextAstReference
  id?: string
  lawDate?: string
  lawType: LawType
  legislation?: "international" | "UE"
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  type: "law"
}

export interface TextAstLawIdentification {
  id?: string
  lawDate?: string
}

export type TextAstLocalisation =
  | { absolute: number }
  | { relative: number | "+∞" }

export interface TextAstNombre {
  id: string
  order: number
}

export type TextAstPortion = {
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  order?: number
  type: PortionType
} & TextAstPosition

export interface TextAstPosition {
  position: TextPosition
}

export type TextAstReference = TextAstAtomicReference | TextAstCompoundReference

export interface TextPosition {
  start: number
  stop: number
}

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
