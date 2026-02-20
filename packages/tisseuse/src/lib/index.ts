export {
  getArticleDateDebut,
  getArticleDateSignature,
  getOrLoadArticleSiblingId,
  sortArticlesByDate,
} from "./articles.js"
export { assertNever } from "./asserts.js"
export {
  newAssembleeObjectCache,
  newLegifranceObjectCache,
  newObjectCache,
  type AssembleeObjectCache,
  type AssembleeObjectType,
  type LegifranceObjectCache,
  type ObjectCache,
} from "./cache.js"
export { formatLongDate } from "./dates.js"
export { extractBillDefinitions } from "./extractors/definitions.js"
export {
  extractActionDirectivesFromHtml,
  extractActionDirectivesFromText,
  type ActionDirective,
} from "./extractors/action_directives.js"
export {
  extractTextLinks,
  iterReferenceLinks,
  type ArticleDefinition,
  type ArticleExternalLink,
  type ArticleInternalLink,
  type ArticleLink,
  type DefinitionOrLink,
  type DivisionExternalLink,
  type DivisionLink,
  type ExtractedLinkDb,
  type TextEuropeanLink,
  type TextExternalLink,
  type TextLink,
  type TextLinksParserState,
} from "./extractors/links.js"
export {
  extractCitationReferences,
  extractReferences,
  extractReferencesWithOriginalTransformations,
  getExtractedReferences,
  getExtractedReferencesWithOriginalTransformations,
} from "./extractors/references.js"
export {
  buildArticlePortionTreeFromHtml,
  extractPortionSelectors,
  resolvePortionSelector,
  type ArticlePortionArticle,
  type ArticlePortionDivision,
  type ArticlePortionItem,
  type ArticlePortionAlinea,
  type ArticlePortionMatch,
  type ArticlePortionNode,
  type PortionSelector,
  type PortionSelectorStep,
} from "./extractors/article_portions.js"
export {
  addPositionsToTableOfContentsItems,
  getExtractedTableOfContentsFromTextBill,
  walkTableOfContents,
  type TableOfContents,
  type TableOfContentsArticle,
  type TableOfContentsArticlePositioned,
  type TableOfContentsDivision,
  type TableOfContentsDivisionPositioned,
  type TableOfContentsPositioned,
} from "./extractors/table_of_contents.js"
export { jsonReplacer } from "./json.js"
export { linkTypes, urlFromLegalId, type LinkType } from "./links.js"
export {
  getOrLoadDocument,
  getOrLoadDocumentsByDossierParlementaireUid,
  getOrLoadDossierParlementaire,
} from "./loaders/assemblee.js"
export {
  extendLoadedArticle,
  getOrLoadArticle,
  getOrLoadJo,
  getOrLoadSectionTa,
  getOrLoadSectionsTa,
  getOrLoadTextelr,
  getOrLoadTexteslr,
  getOrLoadTextesVersions,
  getOrLoadTexteVersion,
  loadArticles,
  type ArticleExtension,
  type JorfArticleExtended,
  type LegiArticleExtended,
} from "./loaders/legifrance.js"
export { action } from "./text_parsers/actions.js"
export {
  article,
  articles,
  definitionArticleDansCitation,
  definitionArticleDansProjetOuPropositionLoi,
  designationArticle,
  listeArticles,
  nomArticle,
  nomSpecialArticle,
} from "./text_parsers/articles.js"
export {
  actionTargets,
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
  type ActionTarget,
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
export type {
  FragmentPosition,
  FragmentReverseTransformation,
} from "./text_parsers/fragments.js"
export {
  addChildLeftToLastChild,
  createEnumerationOrBoundedInterval,
  createParentChildTreeFromReferences,
  iterAtomicFirstParentReferences,
  iterAtomicReferences,
  iterIncludedReferences,
} from "./text_parsers/helpers.js"
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
export {
  adjectifTemporelSingulier,
  ditPluriel,
  ditSingulier,
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./text_parsers/prepositions.js"
export {
  listeReferencesSeules,
  reference,
  referenceSeule,
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
  replaceHtmlPatterns,
  replacePattern,
  replaceTextPatterns,
  simplifyHtml,
  simplifyPlainText,
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
  newReverseTransformationsMergedFromPositionsIterator,
  reversePositionsSplitFromPositions,
  reverseTransformationsMergedFromPositions,
  reverseTransformationFromPosition,
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
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
export {
  cleanTexteTitle,
  getTexteVersionDateDebut,
  getTexteVersionDateSignature,
  sortTextesVersionsByDate,
} from "./textes.js"
