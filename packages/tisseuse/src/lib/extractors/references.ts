import { definitionArticleDansCitation } from "$lib/text_parsers/articles.js"
import type {
  TextAstCitation,
  TextAstPosition,
  TextAstReference,
} from "$lib/text_parsers/ast.js"
import { citation, convertCitationToText } from "$lib/text_parsers/citations.js"
import { definitionDivision } from "$lib/text_parsers/divisions.js"
import { iterIncludedReferences } from "$lib/text_parsers/helpers.js"
import {
  alternatives,
  TextParserContext,
  fastPath,
  type TextParser,
} from "$lib/text_parsers/parsers.js"
import { reference } from "$lib/text_parsers/references.js"
import {
  newReverseTransformationsMergedFromPositionsIterator,
  reverseTransformationFromPosition,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

export function* extractCitationReferences(
  context: TextParserContext,
  citation: TextAstCitation,
): Generator<TextAstReference, void> {
  const citationTransformation = convertCitationToText(context, citation)
  const citationContext = new TextParserContext(citationTransformation.output)
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(citationTransformation)
  for (let reference of extractReferences(citationContext)) {
    // Convert position of reference in citation to an absolute position.
    reference = structuredClone(reference)
    if (citation.references === undefined) {
      citation.references = []
    }
    citation.references.push(reference)
    for (const includedReference of iterIncludedReferences(reference)) {
      const positionInCitation = (includedReference as TextAstPosition).position
      if (positionInCitation === undefined) {
        continue
      }
      const reverseTransformation = reverseTransformationFromPosition(
        originalPositionsFromTransformedIterator,
        positionInCitation,
      )
      ;(includedReference as TextAstPosition).position =
        reverseTransformation.position
    }

    yield reference
  }
}

export function* extractReferences(
  context: TextParserContext,
): Generator<TextAstReference, void> {
  const extractorParser = fastPath<TextAstReference | TextAstCitation>(
    String.raw`arrêtés?|circulaires?|code|constitution|décrets?(?:-loi)?|loi|ordonnance|art\.|articles?|chapitre|livre|paragraphe|partie|section|sous-paragraphe|sous-section|sous-sous-paragraphe|sous-titre|titre|alinéas?|phrases?|règlements?|directives?|décisions?|«|[IVXLCDM]+|[A-Z]|\d+`,
    alternatives(
      citation,
      definitionArticleDansCitation,
      definitionDivision,
      reference,
    ) as unknown as TextParser<TextAstReference | TextAstCitation>,
    80,
    String.raw`(?<=^|\P{Alphabetic})(?:arrêtés?|circulaires?|code|constitution|décrets?(?:-loi)?|loi|ordonnance|art\.|articles?|chapitre|livre|paragraphe|partie|section|sous-paragraphe|sous-section|sous-sous-paragraphe|sous-titre|titre|alinéas?|phrases?|règlements?|directives?|décisions?|«|[IVXLCDM]+|[A-Z]|\d+)(?=\b| |$)`,
  )

  for (const ast of extractorParser.extract!(context, { overlapWindow: 80 })) {
    if (ast !== undefined) {
      if (ast.type === "citation") {
        yield* extractCitationReferences(context, ast as TextAstCitation)
      } else {
        if (
          ast.type === "reference_et_action" ||
          ast.type === "alinéa" ||
          ast.type === "article" ||
          ast.type === "chapitre" ||
          ast.type === "item" ||
          ast.type === "livre" ||
          ast.type === "paragraphe" ||
          ast.type === "partie" ||
          ast.type === "phrase" ||
          ast.type === "section" ||
          ast.type === "sous-paragraphe" ||
          ast.type === "sous-section" ||
          ast.type === "sous-sous-paragraphe" ||
          ast.type === "sous-titre" ||
          ast.type === "titre" ||
          ast.type === "texte" ||
          ast.type === "bounded-interval" ||
          ast.type === "counted-interval" ||
          ast.type === "enumeration" ||
          ast.type === "exclusion" ||
          ast.type === "parent-enfant" ||
          ast.type === "incomplete-header"
        ) {
          for (const includedReference of iterIncludedReferences(ast)) {
            if (includedReference.type === "reference_et_action") {
              const { originalCitations } = includedReference.action
              if (originalCitations !== undefined) {
                for (const originalCitation of originalCitations) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  for (const _ of extractCitationReferences(
                    context,
                    originalCitation,
                  )) {
                    // Do nothing (except setting originalCitation.references)
                  }
                }
              }
            }
          }
        }
        yield ast as TextAstReference
      }
    }
  }
}

export function* extractReferencesWithOriginalTransformations(
  context: TextParserContext,
  transformation: Transformation,
): Generator<TextAstReference, void> {
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(transformation)
  for (const reference of extractReferences(context)) {
    for (const includedReference of iterIncludedReferences(reference, {
      citations: true,
    })) {
      if (includedReference.position !== undefined) {
        includedReference.originalTransformation =
          reverseTransformationFromPosition(
            originalPositionsFromTransformedIterator,
            includedReference.position,
          )
      }
    }
    yield reference
  }
}

export const getExtractedReferences = (
  context: TextParserContext,
): TextAstReference[] => [...extractReferences(context)]

export const getExtractedReferencesWithOriginalTransformations = (
  context: TextParserContext,
  transformation: Transformation,
): TextAstReference[] => [
  ...extractReferencesWithOriginalTransformations(context, transformation),
]
