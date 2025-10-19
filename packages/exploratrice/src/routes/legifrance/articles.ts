import type {
  JorfArticleVersion,
  LegiArticleVersion,
} from "@tricoteuses/legifrance"
import type {
  JorfArticleExtended,
  LegiArticleExtended,
} from "@tricoteuses/tisseuse"

export interface ArticlePageInfos extends ArticleWithLinks {
  mergedVersions: Array<JorfArticleVersion | LegiArticleVersion>
  nextArticleId?: string
  previousArticleId?: string
}

export interface ArticleWithLinks {
  article: JorfArticleExtended | LegiArticleExtended
  blocTextuel?: string
  nota?: string
}
