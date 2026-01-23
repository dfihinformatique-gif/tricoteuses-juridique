import { definitionArticleDansProjetOuPropositionLoi } from "$lib/text_parsers/articles.js"
import {
  type TextAstArticle,
  type TextAstDivision,
} from "$lib/text_parsers/ast.js"
import { definitionDivision } from "$lib/text_parsers/divisions.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"

export function* extractBillDefinitions(
  context: TextParserContext,
): Generator<TextAstArticle | TextAstDivision, void, unknown> {
  let candidate: RegExpExecArray | null
  const candidateRegExp = /^/gm
  while ((candidate = candidateRegExp.exec(context.input)) !== null) {
    const index = candidate.index
    context.offset = index

    const definitionArticleAst = definitionArticleDansProjetOuPropositionLoi(
      context,
    ) as TextAstArticle | undefined
    if (definitionArticleAst !== undefined) {
      yield definitionArticleAst
      candidateRegExp.lastIndex = definitionArticleAst.position.stop
    }

    const definitionDivisionAst = definitionDivision(context) as
      | TextAstDivision
      | undefined
    if (definitionDivisionAst !== undefined) {
      yield definitionDivisionAst
      candidateRegExp.lastIndex = definitionDivisionAst.position.stop
    }

    // Increment candidateRegExp.lastIndex, because regexp has zero length.
    candidateRegExp.lastIndex++
    continue
  }
}
