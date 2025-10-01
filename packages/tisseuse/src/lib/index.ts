export { formatLongDate } from "./dates.js"
export { jsonReplacer } from "./json.js"
export {
  iterCardinalNumeralFormsFromNumber,
  iterLatinMultiplicativeAdverbsFromNumber,
  iterOrdinalNumeralFormsFromNumber,
  numberFromRomanNumeral,
  ordinalNumeralFromNumber,
  romanNumeralFromNumber,
} from "./numbers.js"
export { action } from "./text_parsers/actions.js"
export {
  article,
  articles,
  definitionArticle,
  designationArticle,
  listeArticles,
  nomArticle,
  nomSpecialArticle,
} from "./text_parsers/articles.js"
export {
  compoundReferencesSeparators,
  divisionTypes,
  europeanLawNatures,
  frenchLawNatures,
  internationalLawNatures,
  isTextAstAtomicReference,
  isTextAstDivision,
  isTextAstPortion,
  lawNatures,
  localizationAdverbs,
  portionTypes,
  type CompoundReferencesSeparator,
  type DivisionType,
  type EuropeanLawNature,
  type FrenchLawNature,
  type InternationalLawNature,
  type LawNature,
  type LocalizationAdverb,
  type PortionType,
  type TextAst,
  type TextAstAction,
  type TextAstArticle,
  type TextAstAtomicReference,
  type TextAstBoundedInterval,
  type TextAstCitation,
  type TextAstCompoundReference,
  type TextAstConseilConstitutionnelDecision,
  type TextAstCountedInterval,
  type TextAstDivision,
  type TextAstEnumeration,
  type TextAstExclusion,
  type TextAstIncompleteHeader,
  type TextAstLocalization,
  type TextAstNumber,
  type TextAstParentChild,
  type TextAstPortion,
  type TextAstPosition,
  type TextAstReference,
  type TextAstReferenceAndAction,
  type TextAstText,
  type TextAstTextIdentification,
  type TextAstTextInfos,
  type TextInfosByWordsTree,
  type TextInfosByWordsTreeNode,
} from "./text_parsers/ast.js"
export {
  citation,
  citationLigne,
  citationSimple,
} from "./text_parsers/citations.js"
export { date, duDate } from "./text_parsers/dates.js"
export {
  definitionDivision,
  designationDivision,
  division,
  divisions,
  natureDivisionSingulier,
  numeroDivision,
} from "./text_parsers/divisions.js"
export {
  addChildLeftToLastChild,
  createEnumerationOrBoundedInterval,
  createParentChildTreeFromReferences,
  iterAtomicFirstParentReferences,
  iterAtomicReferences,
  iterIncludedReferences,
} from "./text_parsers/helpers.js"
export {
  getReferences,
  iterCitationReferences,
  iterReferences,
} from "./text_parsers/index.js"
export {
  adjectifNumeralOrdinalCourt,
  adverbeMultiplicatifLatin,
  nombreAsTextAstNumber,
  nombreCardinal,
  nombreRomainCardinal,
  nombreRomainOrdinal,
  nombreRomainOu0iAsTextAstNumber,
} from "./text_parsers/numbers.js"
export {
  alternatives,
  chain,
  convert,
  optional,
  parseText,
  regExp,
  repeat,
  TextParserContext,
  variable,
  wordsTree,
} from "./text_parsers/parsers.js"
export {
  auPortion,
  auxPortions,
  numeroPortion,
  portions,
  unePortion,
} from "./text_parsers/portions.js"
export type { TextPosition } from "./text_parsers/positions.js"
export {
  ditPluriel,
  ditSingulier,
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./text_parsers/prepositions.js"
export {
  reference,
  uniteBasePreciseeSingulier,
  uniteBaseSingulier,
} from "./text_parsers/references.js"
export {
  adverbeRelatif,
  espaceAdverbeRelatif,
  relatifPlurielPrepose,
  relatifSingulierPrepose,
} from "./text_parsers/relative_locations.js"
export {
  convertHtmlElementsToText,
  decodeNamedHtmlEntities,
  decodeNumericHtmlEntities,
  replacePattern,
  replacePatterns,
  simplifyHtml,
  simplifyText,
  simplifyUnicodeCharacters,
} from "./text_parsers/simplifiers.js"
export {
  definitionTexteFrancais,
  identificationTexteEuropeen,
  natureTexteFrancais,
  numeroEtOuDateTexteFrancais,
  numeroTexteEuropeen,
  numeroTexteFrancais,
  optionalEspaceDuTerritoire,
  texte,
  texteEuropeen,
  texteFrancais,
  texteInternational,
} from "./text_parsers/texts.js"
export {
  chainTransformers,
  iterOriginalMergedPositionsFromTransformed,
  originalMergedPositionsFromTransformed,
  originalSplitPositionsFromTransformed,
  type FragmentReverseTransformation,
  type SourceMapSegment,
  type Transformation,
  type TransformationLeaf,
  type TransformationNode,
  type Transformer,
  type TransformerLeaf,
  type TransformerNode,
} from "./text_parsers/transformers.js"
export {
  espace,
  lettreAsciiMinuscule,
  nonLettre,
  numero,
  virguleOuEspace,
} from "./text_parsers/typography.js"
