import type {
  JorfCategorieTag,
  LegiCategorieTag,
} from "@tricoteuses/legifrance"
import type { JSONValue } from "postgres"

export type AssembleeObjectType = "Document" | "DossierParlementaire"

export type AssembleeObjectCache = Map<
  AssembleeObjectType,
  Map<string, JSONValue>
>

export type LegifranceObjectCache = Map<
  JorfCategorieTag | LegiCategorieTag,
  Map<string, JSONValue>
>

export type ObjectCache = {
  assemblee: AssembleeObjectCache
  legifrance: LegifranceObjectCache
}

export const newAssembleeObjectCache = (): AssembleeObjectCache =>
  new Map<AssembleeObjectType, Map<string, JSONValue>>()

export const newLegifranceObjectCache = (): LegifranceObjectCache =>
  new Map<JorfCategorieTag | LegiCategorieTag, Map<string, JSONValue>>()

export const newObjectCache = (): ObjectCache => ({
  assemblee: newAssembleeObjectCache(),
  legifrance: newLegifranceObjectCache(),
})
