import { iterArrayOrSingleton } from "@tricoteuses/explorer-tools"

import type { Aggregate, Follow } from "$lib/aggregates"
import {
  rootTypeFromLegalId,
  type Article,
  type LegalObjectType,
  type SectionTa,
  type Textekali,
  type Textelr,
  type TexteVersion,
} from "$lib/legal"
import { db } from "$lib/server/databases"

export class Aggregator {
  article: { [id: string]: Article } = {}
  follow: Set<Follow>
  requestedTypeAndIds: Set<TypeAndId> = new Set()
  section_ta: { [id: string]: SectionTa } = {}
  texte_version: { [id: string]: TexteVersion } = {}
  textekali: { [id: string]: Textekali } = {}
  textelr: { [id: string]: Textelr } = {}
  visitedTypeAndIds: Set<TypeAndId> = new Set()

  constructor(follow: Iterable<Follow>) {
    this.follow = new Set(follow)
  }

  addArticle(article: Article): void {
    const id = article.META.META_COMMUN.ID
    this.article[id] = article

    if (this.follow.has("LIENS.LIEN[@sens=cible,@typelien=CREATION].@id")) {
      for (const lien of iterArrayOrSingleton(article.LIENS?.LIEN)) {
        if (lien["@sens"] === "cible" && lien["@typelien"] === "CREATION") {
          this.requestId(lien["@id"])
        }
      }
    }
  }

  addSectionTa(sectionTa: SectionTa): void {
    const id = sectionTa.ID
    this.section_ta[id] = sectionTa

    if (this.follow.has("STRUCTURE_TA.LIEN_ART.@id")) {
      for (const lien of iterArrayOrSingleton(
        sectionTa.STRUCTURE_TA.LIEN_ART,
      )) {
        this.requestId(lien["@id"])
      }
    }

    if (this.follow.has("STRUCTURE_TA.LIEN_SECTION_TA.@id")) {
      for (const lien of iterArrayOrSingleton(
        sectionTa.STRUCTURE_TA.LIEN_SECTION_TA,
      )) {
        this.requestId(lien["@id"])
      }
    }
  }

  addTextekali(textekali: Textekali): void {
    const id = textekali.META.META_COMMUN.ID
    this.textekali[id] = textekali

    if (this.follow.has("STRUCT.LIEN_ART.@id")) {
      for (const lien of iterArrayOrSingleton(textekali.STRUCT.LIEN_ART)) {
        this.requestId(lien["@id"])
      }
    }

    if (this.follow.has("STRUCT.LIEN_SECTION_TA.@id")) {
      for (const lien of iterArrayOrSingleton(
        textekali.STRUCT.LIEN_SECTION_TA,
      )) {
        this.requestId(lien["@id"])
      }
    }
  }

  addTextelr(textelr: Textelr): void {
    const id = textelr.META.META_COMMUN.ID
    this.textelr[id] = textelr

    if (this.follow.has("STRUCT.LIEN_ART.@id")) {
      for (const lien of iterArrayOrSingleton(textelr.STRUCT.LIEN_ART)) {
        this.requestId(lien["@id"])
      }
    }

    if (this.follow.has("STRUCT.LIEN_SECTION_TA.@id")) {
      for (const lien of iterArrayOrSingleton(textelr.STRUCT.LIEN_SECTION_TA)) {
        this.requestId(lien["@id"])
      }
    }
  }

  addTexteVersion(texteVersion: TexteVersion): void {
    const id = texteVersion.META.META_COMMUN.ID
    this.texte_version[id] = texteVersion

    if (this.follow.has("TEXTEKALI")) {
      this.requestTypeAndId(["textekali", id])
    }
    if (this.follow.has("TEXTELR")) {
      this.requestTypeAndId(["textelr", id])
    }
  }

  addToVisitedTypeAndIds(typeAndIds: TypeAndId[]) {
    for (const typeAndId of typeAndIds) {
      this.visitedTypeAndIds.add(typeAndId)
    }
  }

  deleteFromRequestedTypeAndIds(typeAndIds: TypeAndId[]) {
    for (const typeAndId of typeAndIds) {
      this.requestedTypeAndIds.delete(typeAndId)
    }
  }

  async getAll(): Promise<void> {
    while (this.requestedTypeAndIds.size > 0) {
      console.log(
        "Aggregator.getAll: this.requestedTypeAndIds.size =",
        this.requestedTypeAndIds.size,
      )

      {
        const articleTypeAndIds = [...this.requestedTypeAndIds].filter(
          ([type]) => type === "article",
        )
        if (articleTypeAndIds.length > 0) {
          this.deleteFromRequestedTypeAndIds(articleTypeAndIds)
          for (const { data } of await db<{ id: string; data: Article }[]>`
              SELECT id, data FROM article
              WHERE id IN ${db(articleTypeAndIds.map(([, id]) => id))}
            `) {
            this.addArticle(data)
          }
          this.addToVisitedTypeAndIds(articleTypeAndIds)
        }
      }

      {
        const sectionTaTypeAndIds = [...this.requestedTypeAndIds].filter(
          ([type]) => type === "section_ta",
        )
        if (sectionTaTypeAndIds.length > 0) {
          this.deleteFromRequestedTypeAndIds(sectionTaTypeAndIds)
          for (const { data } of await db<{ id: string; data: SectionTa }[]>`
              SELECT id, data FROM section_ta
              WHERE id IN ${db(sectionTaTypeAndIds.map(([, id]) => id))}
            `) {
            this.addSectionTa(data)
          }
          this.addToVisitedTypeAndIds(sectionTaTypeAndIds)
        }
      }

      {
        const textekaliTypeAndIds = [...this.requestedTypeAndIds].filter(
          ([type]) => type === "textekali",
        )
        if (textekaliTypeAndIds.length > 0) {
          this.deleteFromRequestedTypeAndIds(textekaliTypeAndIds)
          for (const { data } of await db<{ id: string; data: Textekali }[]>`
              SELECT id, data FROM textekali
              WHERE id IN ${db(textekaliTypeAndIds.map(([, id]) => id))}
            `) {
            this.addTextekali(data)
          }
          this.addToVisitedTypeAndIds(textekaliTypeAndIds)
        }
      }

      {
        const textelrTypeAndIds = [...this.requestedTypeAndIds].filter(
          ([type]) => type === "textelr",
        )
        if (textelrTypeAndIds.length > 0) {
          this.deleteFromRequestedTypeAndIds(textelrTypeAndIds)
          for (const { data } of await db<{ id: string; data: Textelr }[]>`
              SELECT id, data FROM textelr
              WHERE id IN ${db(textelrTypeAndIds.map(([, id]) => id))}
            `) {
            this.addTextelr(data)
          }
          this.addToVisitedTypeAndIds(textelrTypeAndIds)
        }
      }
    }
  }

  requestId(id: string): void {
    const rootType = rootTypeFromLegalId(id)
    if (rootType !== undefined) {
      return this.requestTypeAndId([rootType, id])
    }
  }

  requestTypeAndId(typeAndId: TypeAndId): void {
    if (!this.visitedTypeAndIds.has(typeAndId)) {
      this.requestedTypeAndIds.add(typeAndId)
    }
  }

  toJson(): Aggregate {
    const json: Aggregate = {}
    if (Object.keys(this.article).length > 0) {
      json.article = this.article
    }
    if (Object.keys(this.section_ta).length > 0) {
      json.section_ta = this.section_ta
    }
    if (Object.keys(this.texte_version).length > 0) {
      json.texte_version = this.texte_version
    }
    if (Object.keys(this.textekali).length > 0) {
      json.textekali = this.textekali
    }
    if (Object.keys(this.textelr).length > 0) {
      json.textelr = this.textelr
    }
    return json
  }
}

export type TypeAndId = [LegalObjectType, string]
