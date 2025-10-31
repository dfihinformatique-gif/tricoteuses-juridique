import type {
  JorfArticleExtended,
  LegiArticleExtended,
} from "@tricoteuses/tisseuse"

export type ArticleDisplayMode = (typeof articleDisplayModes)[number]

export interface ArticlePageInfos extends ArticleWithLinks {
  otherVersionsArticles: Array<JorfArticleExtended | LegiArticleExtended>
  nextArticleId?: string
  previousArticleId?: string
}

export interface ArticleWithLinks {
  article: JorfArticleExtended | LegiArticleExtended
  blocTextuel?: string
  nota?: string
}

export const articleDisplayModes = [
  "inline_diff",
  "links",
  "references",
  "side-by-side_diff",
] as const
