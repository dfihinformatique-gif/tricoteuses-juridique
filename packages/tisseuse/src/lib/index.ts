export type { TextPosition } from "./text_parsers/positions.js"
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
