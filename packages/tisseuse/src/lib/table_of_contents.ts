import type { DivisionType } from "$lib/text_parsers/ast.js"
import {
  FragmentPosition,
  FragmentReverseTransformation,
} from "./text_parsers/fragments.js"

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
