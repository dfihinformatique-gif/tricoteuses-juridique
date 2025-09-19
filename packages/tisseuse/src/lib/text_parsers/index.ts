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
import { originalMergedPositionsFromTransformed } from "./transformers.js"

export function* iterCitationReferences(
  context: TextParserContext,
  citation: TextAstCitation,
): Generator<TextAstReference, void> {
  const citationTransformation = convertCitationToText(context, citation)
  const citationContext = new TextParserContext(citationTransformation.output)
  for (let reference of iterReferences(citationContext)) {
    // Convert position of reference in citation to an absolute position.
    reference = structuredClone(reference)
    for (const includedReference of iterIncludedReferences(reference)) {
      const positionInCitation = (includedReference as TextAstPosition).position
      if (positionInCitation === undefined) {
        continue
      }
      // Note: Iterator iterOriginalMergedPositionsFromTransformed can't be used,
      // because positions of included references are not sequential, they are embedded
      // in their parent.
      const reverseTransformations = originalMergedPositionsFromTransformed(
        citationTransformation,
        [positionInCitation],
      )
      if (reverseTransformations.length !== 1) {
        throw new Error(
          `Reverse transformation of position in citation to absolute position failed: ${positionInCitation} has been tranformed to ${reverseTransformations}`,
        )
      }
      ;(includedReference as TextAstPosition).position =
        reverseTransformations[0].position
    }

    yield reference
  }
}

export function* iterReferences(
  context: TextParserContext,
): Generator<TextAstReference, void> {
  let candidate: RegExpExecArray | null
  const candidateRegExp = new RegExp(
    String.raw`
      (?:
        ^                             # début de ligne
        (?:                           # définition d'un article ou d'une division
          art\.
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
        (?:«)                         # citation
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
      yield* iterCitationReferences(context, citationAst)
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
      yield referenceAst
      candidateRegExp.lastIndex = referenceAst.position.stop
    }
  }
}

export const getReferences = (
  context: TextParserContext,
): TextAstReference[] => [...iterReferences(context)]
