import {
  TextAstArticle,
  TextAstDivision,
  TextAstPosition,
  TextAstReference,
  TextAstText,
} from "./ast.js"
import { FragmentPosition, FragmentReverseTransformation } from "./fragments.js"

export type DefinitionOrLink =
  | ArticleDefinition
  | ArticleLink
  // | DivisionDefinition
  | DivisionLink
  | TextLink

export interface ArticleDefinition {
  article: TextAstArticle
  /**
   * Same value as article.originalTransformation, added for homogeneity
   *
   * Only defined when a transformation was used to convert input text
   * simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
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
  /**
   * Only defined when a transformation was used to convert input text
   * simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  type: "external_article"
}

export interface ArticleInternalLink {
  article: TextAstArticle
  definition: ArticleDefinition
  /**
   * Only defined when a transformation was used to convert input text
   * simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
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
  /**
   * Only defined when a transformation was used to convert input text
   * simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  sectionTaId?: string
  type: "external_division"
}

// export interface DivisionInternalLink {
//   division: TextAstDivision
//   definition: DivisionDefinition
//   /**
//    * Only defined when a transformation was used to convert input text
//    * simplified text.
//    */
//   originalTransformation?: FragmentReverseTransformation
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
  /**
   * Only defined when a transformation was used to convert input text
   * simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  text: TextAstText & TextAstPosition
  type: "external_text"
}

export type TextLink = TextExternalLink // No internal link yet
