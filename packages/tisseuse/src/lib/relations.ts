import type {
  JorfArticleEtat,
  JorfTextelrEtat,
  JorfTexteNature,
  JorfTexteVersionLienType,
} from "$lib/legal/jorf"
import type {
  LegiArticleEtat,
  LegiArticleLienType,
  LegiTexteEtat,
  LegiTextelrLienSectionTaEtat,
  LegiTexteNature,
  LegiTexteVersionLienType,
} from "$lib/legal/legi"
import type { ArticleType, Sens } from "$lib/legal/shared"

export interface ArticleRecap extends RecapBase {
  endDate?: string
  /**
   * Numéro de l'article
   */
  number?: string
  state?: JorfArticleEtat | LegiArticleEtat
  startDate?: string
  texte?: RecapReference | TexteRecap
  type?: ArticleType
}

export interface Edge extends EdgeWithoutNode {
  node: RelationNode
}

export type EdgesById = Map<string, Edge[]>

export interface EdgeWithoutNode {
  direction: Sens
  linkType:
    | JorfTexteVersionLienType
    | LegiArticleLienType
    | LegiTexteVersionLienType
}

export interface JoRecap extends RecapBase {
  date: string
  number?: string
  title: string
}

export interface LegalObjectRelations {
  id: string
  incoming?: Edge[]
  outgoing?: Edge[]
}

export interface RecapBase {
  id: string // ID of object that is the start (from) or the end (to) of the link
}

export type RecapReference = RecapBase

export type RelationArticle = ArticleRecap &
  RelationNodeBase & {
    kind: "ARTICLE"
  }

export type RelationJo = JoRecap &
  RelationNodeBase & {
    kind: "JO"
  }

export type RelationNode =
  | RelationArticle
  | RelationJo
  | RelationNodeReference
  | RelationSectionTa
  | RelationTexte

export type RelationNodeById = Map<string, RelationNode>

export interface RelationNodeBase {
  kind?: RelationNodeKind | undefined
}

export type RelationNodeKind = (typeof allRelationNodeKinds)[number]

export type RelationNodeReference = RecapReference &
  RelationNodeBase & {
    kind?: undefined
  }

export type RelationSectionTa = SectionTaRecap &
  RelationNodeBase & {
    kind: "SECTION_TA"
  }

export type RelationTexte = TexteRecap &
  RelationNodeBase & {
    kind: "TEXTE"
  }

export interface SectionTaRecap extends RecapBase {
  endDate: string
  /**
   * The breadcrumb of parents SectionTa that are defined at the
   * start date of Relation.id
   */
  parentSectionsTaRecap?: Array<RecapReference | SectionTaRecap>
  startDate: string
  state?: LegiTextelrLienSectionTaEtat
  texte?: RecapReference | TexteRecap
  title?: string
}

export interface TexteRecap extends RecapBase {
  endDate?: string
  nature?: JorfTexteNature | LegiTexteNature
  startDate?: string
  state?: JorfTextelrEtat | LegiTexteEtat
  title?: string
}

export const allRelationNodeKinds = [
  "ARTICLE",
  "JO",
  "SECTION_TA",
  "TEXTE",
] as const
