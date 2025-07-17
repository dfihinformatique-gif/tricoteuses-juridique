import type { TextAstReference } from "./ast.js"
import { chain, TextParserContext, type TextParser } from "./parsers.js"
import { reference } from "./references.js"

export function* iterReferences(
  context: TextParserContext,
  {
    parser = reference,
  }: { context?: TextParserContext; parser?: TextParser | TextParser[] } = {},
): Generator<TextAstReference, void> {
  if (Array.isArray(parser)) {
    parser = chain(parser)
  }

  let candidate: RegExpExecArray | null
  const candidateRegExp =
    /(?<=^|\P{Alphabetic})«|(?:au|le|du)(?:dit)?(?= )|(?:[àa] +)?la(?:dite)?(?= )|(?:[àa] +)?l['’]|(?:aux|les|des)(?:dits)?(?= )/giv
  while ((candidate = candidateRegExp.exec(context.input)) !== null) {
    const index = candidate.index

    if (candidate[0] === "«") {
      // Skip quoted text.
      const rightQuoteIndex = context.input.slice(index + 1).indexOf("»")
      if (rightQuoteIndex === -1) {
        return
      }
      candidateRegExp.lastIndex = index + rightQuoteIndex
      continue
    }

    context.offset = index
    const reference = parser(context) as TextAstReference
    if (reference === undefined) {
      continue
    }
    yield reference
    candidateRegExp.lastIndex = index + reference.position.stop
  }
}

export const getReferences = (
  context: TextParserContext,
  { parser = reference }: { parser?: TextParser | TextParser[] } = {},
): TextAstReference[] => [...iterReferences(context, { parser })]
