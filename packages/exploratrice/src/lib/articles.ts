import type { JorfArticle, LegiArticle } from "@tricoteuses/legifrance"

export interface ArticlePageInfos extends ArticleWithLinks {
  nextArticleId?: string
  previousArticleId?: string
}

export interface ArticleWithLinks {
  article: JorfArticle | LegiArticle
  blocTextuel?: string
  nota?: string
}
