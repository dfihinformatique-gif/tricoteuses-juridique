import { definitionArticle } from "./articles.js"
import type {
  TextAstArticle,
  TextAstCitation,
  TextAstDivision,
  TextAstPosition,
  TextAstReference,
} from "./ast.js"
import { citation, convertCitationToText } from "./citations.js"
import { definitionDivision } from "./divisions.js"
import { iterIncludedReferences } from "./helpers.js"
import { TextParserContext } from "./parsers.js"
import { reference } from "./references.js"
import {
  newReverseTransformationsMergedFromPositionsIterator,
  reverseTransformationFromPosition,
  type Transformation,
} from "./transformers.js"

export function* parseCitationReferences(
  context: TextParserContext,
  citation: TextAstCitation,
): Generator<TextAstReference, void> {
  const citationTransformation = convertCitationToText(context, citation)
  const citationContext = new TextParserContext(citationTransformation.output)
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(citationTransformation)
  for (let reference of parseReferences(citationContext)) {
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

export function* parseReferences(
  context: TextParserContext,
): Generator<TextAstReference, void> {
  let candidate: RegExpExecArray | null
  const candidateRegExp = new RegExp(
    String.raw`
      (?:
        ^ # début de ligne
        (?:
          # Référence à un texte
          arrêtés?
          |circulaires?
          |code
          |constitution
          |décret-loi
          |décrets?
          # Note : "|livre des procédures fiscales" est traité par la définition de "livre" ci-dessous.
          |loi
          |ordonnance

          # Définition d'un article ou d'une division
          |art\.
          |chapitre
          |livre
          |paragraphe
          |partie"
          |section
          |sous-paragraphe
          |sous-section
          |sous-sous-paragraphe
          |sous-titre
          |titre
        )
        (?= )
      )
      |(?<=^|\P{Alphabetic})(?:
        (?:«) # citation
        |(?:au|le|du)(?:dit)?(?= )
        |(?:[àa] +)?la(?:dite)?(?= )
        |(?:[àa] +)?(?:l')
        |(?:aux|les|des)(?:dits)?(?= )
      )
    `
      .replace(/\s+#.*$/gm, "") // Remove comments
      .replace(/^\s+/gm, "")
      .replace(/\n/g, "")
      .replace(/\\n/g, "\n"),
    "gimv",
  )
  while ((candidate = candidateRegExp.exec(context.input)) !== null) {
    const index = candidate.index
    context.offset = index
    if (candidate[0] === "«") {
      // ligne de citation ou citation simple
      const citationAst = citation(context) as TextAstCitation | undefined
      if (citationAst === undefined) {
        continue
      }
      yield* parseCitationReferences(context, citationAst)
      candidateRegExp.lastIndex = citationAst.position.stop
    } else if (candidate[0].toLowerCase() === "art.") {
      const definitionArticleAst = definitionArticle(context) as
        | TextAstArticle
        | undefined
      if (definitionArticleAst === undefined) {
        continue
      }
      yield definitionArticleAst
      candidateRegExp.lastIndex = definitionArticleAst.position.stop
    } else if (
      [
        "chapitre",
        "livre",
        "paragraphe",
        "partie",
        "section",
        "sous-paragraphe",
        "sous-section",
        "sous-sous-paragraphe",
        "sous-titre",
        "titre",
      ].includes(candidate[0].toLowerCase())
    ) {
      const definitionDivisionAst = definitionDivision(context) as
        | TextAstDivision
        | undefined
      if (definitionDivisionAst === undefined) {
        continue
      }
      yield definitionDivisionAst
      candidateRegExp.lastIndex = definitionDivisionAst.position.stop
    } else {
      const referenceAst = reference(context) as TextAstReference | undefined
      if (referenceAst === undefined) {
        continue
      }
      for (const includedReference of iterIncludedReferences(referenceAst)) {
        if (includedReference.type === "reference_et_action") {
          const { originalCitations } = includedReference.action
          if (originalCitations !== undefined) {
            for (const originalCitation of originalCitations) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              for (const _ of parseCitationReferences(
                context,
                originalCitation,
              )) {
                // Do nothing (except setting originalCitation.references)
              }
            }
          }
        }
      }
      yield referenceAst
      candidateRegExp.lastIndex = referenceAst.position.stop
    }
  }
}

export function* parseReferencesWithOriginalTransformations(
  context: TextParserContext,
  transformation: Transformation,
): Generator<TextAstReference, void> {
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(transformation)
  for (const reference of parseReferences(context)) {
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

export const getParsedReferences = (
  context: TextParserContext,
): TextAstReference[] => [...parseReferences(context)]

export const getParsedReferencesWithOriginalTransformations = (
  context: TextParserContext,
  transformation: Transformation,
): TextAstReference[] => [
  ...parseReferencesWithOriginalTransformations(context, transformation),
]
