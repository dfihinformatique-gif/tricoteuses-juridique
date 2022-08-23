import { iterArrayOrSingleton } from "@tricoteuses/explorer-tools"

import type { Follow } from "$lib/aggregates"
import type { Article, Lien } from "$lib/legal"
import { db } from "$lib/server/database"

export interface Aggregate {
  article?: { [id: string]: Article }
  id?: string
  ids?: string[]
}

export class Aggregator {
  article: { [id: string]: Article } = {}
  follow: Set<Follow>
  requestedIds: Set<string> = new Set()
  visitedIds: Set<string> = new Set()

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

  addToVisitedIds(ids: string[]) {
    for (const id of ids) {
      this.visitedIds.add(id)
    }
  }

  deleteFromRequestedIds(ids: string[]) {
    for (const id of ids) {
      this.requestedIds.delete(id)
    }
  }

  async getAll(): Promise<void> {
    while (true) {
      if (this.requestedIds.size === 0) {
        break
      }
      console.log("this.requestedIds.size", this.requestedIds.size)

      {
        const articleIds = [...this.requestedIds].filter(
          (id) => id.match(/^[A-Z]{4}ARTI/) !== null,
        )
        if (articleIds.length > 0) {
          this.deleteFromRequestedIds(articleIds)
          for (const { data } of await db<{ id: string; data: Article }[]>`
              SELECT id, data FROM article
              WHERE id IN ${db(articleIds)}
            `) {
            this.addArticle(data)
          }
          this.addToVisitedIds(articleIds)
        }
      }
    }
  }

  requestId(id: string): void {
    if (!this.visitedIds.has(id)) {
      this.requestedIds.add(id)
    }
  }

  toJson(): Aggregate {
    const json: Aggregate = {}
    if (Object.keys(this.article).length > 0) {
      json.article = this.article
    }
    return json
  }
}
