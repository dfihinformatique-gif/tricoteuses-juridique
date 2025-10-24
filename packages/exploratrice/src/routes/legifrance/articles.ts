import type {
  JorfArticleExtended,
  LegiArticleExtended,
} from "@tricoteuses/tisseuse"

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
