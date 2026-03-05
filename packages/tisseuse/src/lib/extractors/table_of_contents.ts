import { isTextAstDivision, type DivisionType } from "$lib/text_parsers/ast.js"
import {
  FragmentPosition,
  FragmentReverseTransformation,
} from "$lib/text_parsers/fragments.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  newReverseTransformationsMergedFromPositionsIterator,
  reverseTransformationFromPosition,
  Transformation,
} from "$lib/text_parsers/transformers.js"

import { extractBillDefinitions } from "./definitions.js"

export interface TableOfContents {
  articles?: TableOfContentsArticle[]
  divisions?: TableOfContentsDivision[]
}

export interface TableOfContentsArticle {
  line: string
  type: "article"
}

export type TableOfContentsArticlePositioned = TableOfContentsArticle & {
  originalTransformation: FragmentReverseTransformation
  position: FragmentPosition
}

export interface TableOfContentsDivision {
  articles?: TableOfContentsArticle[]
  divisions?: TableOfContentsDivision[]
  line: string
  type: DivisionType
}

export type TableOfContentsDivisionPositioned = TableOfContentsDivision & {
  articles?: TableOfContentsArticlePositioned[]
  divisions?: TableOfContentsDivisionPositioned[]
  originalTransformation: FragmentReverseTransformation
  position: FragmentPosition
}

export interface TableOfContentsPositioned {
  articles?: TableOfContentsArticlePositioned[]
  divisions?: TableOfContentsDivisionPositioned[]
}

export function* addPositionsToTableOfContentsItems({
  context,
  tableOfContents,
  transformation,
}: {
  context: TextParserContext
  tableOfContents: TableOfContents
  transformation: Transformation
}): Generator<
  TableOfContentsArticlePositioned | TableOfContentsDivisionPositioned,
  void,
  unknown
> {
  let index = 0
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(transformation)
  for (const tableOfContentsItem of walkTableOfContents(tableOfContents)) {
    const escapedLine = tableOfContentsItem.line.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )
    const lineRegExp = new RegExp(`^${escapedLine}$`, "m")
    lineRegExp.lastIndex = index
    const lineMatch = lineRegExp.exec(context.input)
    if (lineMatch === null) {
      throw new Error(
        `Table of contents item "${tableOfContentsItem.line}" not found in HTML`,
      )
    }

    const position: FragmentPosition = {
      start: lineMatch.index,
      stop: lineMatch.index + lineMatch[0].length,
    }
    const originalTransformation = reverseTransformationFromPosition(
      originalPositionsFromTransformedIterator,
      position,
    )
    const tableOfContentsItemPositioned = tableOfContentsItem as
      | TableOfContentsArticlePositioned
      | TableOfContentsDivisionPositioned
    tableOfContentsItemPositioned.originalTransformation =
      originalTransformation
    tableOfContentsItemPositioned.position = position
    yield tableOfContentsItemPositioned

    index = position.stop
  }
}

export function getExtractedTableOfContentsFromTextBill(
  textBill: string,
): TableOfContents {
  const context = new TextParserContext(textBill)
  const tableOfContents: TableOfContents = {}
  const tableOfContentsStack: TableOfContentsDivision[] = []
  for (const definition of extractBillDefinitions(context)) {
    if (isTextAstDivision(definition)) {
      const divisionIndex = tableOfContentsStack.findIndex(
        ({ type }) => type === definition.type,
      )
      if (divisionIndex !== -1) {
        tableOfContentsStack.splice(divisionIndex)
      }
      const currentTableOfContentsLevel:
        | TableOfContents
        | TableOfContentsDivision =
        tableOfContentsStack.at(-1) ?? tableOfContents
      if (currentTableOfContentsLevel.divisions === undefined) {
        currentTableOfContentsLevel.divisions = []
      }
      const tableOfContentsDivision = {
        line:
          context.text(definition.position) +
          (definition.definitionSuffix ?? ""),
        type: definition.type,
      }
      currentTableOfContentsLevel.divisions.push(tableOfContentsDivision)
      tableOfContentsStack.push(tableOfContentsDivision)
    } else if (definition.type === "article") {
      const currentTableOfContentsLevel:
        | TableOfContents
        | TableOfContentsDivision =
        tableOfContentsStack.at(-1) ?? tableOfContents
      if (currentTableOfContentsLevel.articles === undefined) {
        currentTableOfContentsLevel.articles = []
      }
      currentTableOfContentsLevel.articles.push({
        line:
          context.text(definition.position) +
          (definition.definitionSuffix ?? ""),
        type: "article",
      })
    } else {
      throw new Error(
        // @ts-expect-error: Unexpected definition type
        `Unexpected type "${definition.type}" in definition:\n${JSON.stringify(definition, null, 2)}`,
      )
    }
  }

  return tableOfContents
}

export function* walkTableOfContents(
  tableOfContents: TableOfContents | TableOfContentsDivision,
): Generator<TableOfContentsArticle | TableOfContentsDivision, void, unknown> {
  if ((tableOfContents as TableOfContentsDivision).type !== undefined) {
    yield tableOfContents as TableOfContentsDivision
  }
  if (tableOfContents.articles !== undefined) {
    yield* tableOfContents.articles
  }
  if (tableOfContents.divisions !== undefined) {
    for (const tableOfContentsDivision of tableOfContents.divisions) {
      yield* walkTableOfContents(tableOfContentsDivision)
    }
  }
}
