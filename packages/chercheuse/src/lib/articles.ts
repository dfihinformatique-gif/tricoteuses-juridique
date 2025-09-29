import type { JorfArticle, LegiArticle } from "@tricoteuses/legifrance"

export interface ArticleWithLinks {
  article: JorfArticle | LegiArticle
  blocTextuel?: string
  nota?: string
}
