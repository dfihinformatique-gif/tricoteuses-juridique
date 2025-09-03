import type {
  TextAstCitation,
  TextAstPosition,
  TextAstReference,
} from "./ast.js"
import { citation, convertCitationToText } from "./citations.js"
import { iterIncludedReferences } from "./helpers.js"
import { chain, TextParserContext, type TextParser } from "./parsers.js"
import { reference } from "./references.js"
import { iterOriginalMergedPositionsFromTransformed } from "./transformers.js"

export function* iterReferences(
  context: TextParserContext,
  {
    citationParser = citation,
    referenceParser = reference,
  }: {
    citationParser?: TextParser | TextParser[]
    referenceParser?: TextParser | TextParser[]
  } = {},
): Generator<TextAstReference, void> {
  if (Array.isArray(citationParser)) {
    citationParser = chain(citationParser)
  }
  if (Array.isArray(referenceParser)) {
    referenceParser = chain(referenceParser)
  }

  let candidate: RegExpExecArray | null
  const candidateRegExp =
    /(?:(?:^|\n)«)|(?:(?<=^|\P{Alphabetic})(?:«)|(?:au|le|du)(?:dit)?(?= )|(?:[àa] +)?la(?:dite)?(?= )|(?:[àa] +)?(?:l')|(?:aux|les|des)(?:dits)?(?= ))/giv
  while ((candidate = candidateRegExp.exec(context.input)) !== null) {
    const index = candidate.index
    context.offset = index
    if (["\n«", "«"].includes(candidate[0])) {
      const citation = citationParser(context) as TextAstCitation | undefined
      if (citation === undefined) {
        continue
      }
      const citationTransformation = convertCitationToText(context, citation)
      const citationContext = new TextParserContext(
        citationTransformation.output,
      )
      const originalMergedPositionsFromTransformedIterator =
        iterOriginalMergedPositionsFromTransformed(citationTransformation)
      // Initialize iterator by sending a dummy value and ignoring the result.
      originalMergedPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
      for (const reference of iterReferences(citationContext, {
        citationParser,
        referenceParser,
      })) {
        // Convert position of reference in citation to an absolute position.
        for (const includedReference of iterIncludedReferences(reference)) {
          const positionInCitation = (includedReference as TextAstPosition)
            .position
          const result =
            originalMergedPositionsFromTransformedIterator.next(
              positionInCitation,
            )
          if (result.done) {
            throw new Error(
              `Reverse transformation of position in citation to absolute position failed: ${positionInCitation}`,
            )
          }
          const reverseTransformation = result.value
          if (reverseTransformation !== undefined) {
            ;(includedReference as TextAstPosition).position =
              reverseTransformation.position
          }
        }

        yield reference
      }
      candidateRegExp.lastIndex = citation.position.stop
    } else {
      const reference = referenceParser(context) as TextAstReference | undefined
      if (reference === undefined) {
        continue
      }
      yield reference
      candidateRegExp.lastIndex = reference.position.stop
    }
  }
}

export const getReferences = (
  context: TextParserContext,
  {
    citationParser = citation,
    referenceParser = reference,
  }: {
    citationParser?: TextParser | TextParser[]
    referenceParser?: TextParser | TextParser[]
  } = {},
): TextAstReference[] => [
  ...iterReferences(context, {
    citationParser,
    referenceParser,
  }),
]
