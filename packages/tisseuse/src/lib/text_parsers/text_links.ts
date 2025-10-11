import {
  TextAstArticle,
  TextAstDivision,
  TextAstPosition,
  TextAstReference,
  TextAstText,
} from "./ast.js"
import { FragmentPosition } from "./fragments.js"

export type DefinitionOrLink =
  | ArticleDefinition
  | ArticleLink
  // | DivisionDefinition
  | DivisionLink
  | TextLink

export interface ArticleDefinition {
  article: TextAstArticle
  /**
   * Same value as article.position, added for homogeneity
   */
  position: FragmentPosition
  reference: TextAstReference
  textId: string
  type: "article_definition"
}

export interface ArticleExternalLink {
  article: TextAstArticle
  articleId?: string
  position: FragmentPosition
  reference: TextAstReference
  type: "external_article"
}

export interface ArticleInternalLink {
  article: TextAstArticle
  definition: ArticleDefinition
  position: FragmentPosition
  reference: TextAstReference
  type: "internal_article"
}

export type ArticleLink = ArticleExternalLink | ArticleInternalLink

// export interface DivisionDefinition {
//   division: TextAstDivision
//   /**
//    * Same value as division.position, added for homogeneity
//    */
//   position: FragmentPosition
//   reference: TextAstReference
//   textId: string
//   type: "division_definition"
// }

export interface DivisionExternalLink {
  division: TextAstDivision
  position: FragmentPosition
  reference: TextAstReference
  sectionTaId?: string
  type: "external_division"
}

// export interface DivisionInternalLink {
//   division: TextAstDivision
//   definition: DivisionDefinition
//   position: FragmentPosition
//   reference: TextAstReference
//   type: "internal_division"
// }

export type DivisionLink = DivisionExternalLink // | DivisionInternalLink

export interface ExtractedLinkDb {
  field_name: string
  index: number
  link: ArticleExternalLink | DivisionExternalLink | TextExternalLink
  source_id: string
  target_id: string | null
}

export interface TextExternalLink {
  position: FragmentPosition
  reference: TextAstReference
  text: TextAstText & TextAstPosition
  type: "external_text"
}

export type TextLink = TextExternalLink // No internal link yet
