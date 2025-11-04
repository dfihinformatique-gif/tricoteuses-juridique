import { describe, expect, test } from "vitest"

import { legiDb } from "$lib/server/databases/index.js"

import {
  getArticleDateDebut,
  getArticleDateSignature,
  getOrLoadArticleSiblingId,
} from "./articles.js"
import { newLegifranceObjectCache } from "./cache.js"
import { getOrLoadArticle } from "./loaders/legifrance.js"

describe("getArticleDateDebut", async () => {
  test("getArticleDateDebut(LEGIARTI000048665041)", async () => {
    const article = await getOrLoadArticle(
      legiDb,
      newLegifranceObjectCache(),
      "LEGIARTI000048665041",
    )
    expect(article).not.toBe(undefined)
    expect(getArticleDateDebut(article!)).toBe("2023-12-23")
  })
})

describe("getArticleDateSignature", async () => {
  test("getArticleDateSignature(JORFARTI000033203048)", async () => {
    const article = await getOrLoadArticle(
      legiDb,
      newLegifranceObjectCache(),
      "JORFARTI000033203048",
    )
    expect(article).not.toBe(undefined)
    expect(getArticleDateSignature(article!)).toBe("2016-10-07")
  })

  test("getArticleDateSignature(LEGIARTI000033205152)", async () => {
    const article = await getOrLoadArticle(
      legiDb,
      newLegifranceObjectCache(),
      "LEGIARTI000033205152",
    )
    expect(article).not.toBe(undefined)
    expect(getArticleDateSignature(article!)).toBe("2016-10-07")
  })
})

describe("getOrLoadArticleSiblingId", async () => {
  test("getOrLoadArticleSiblingId(JORFARTI000033203048, 1)", async () => {
    expect(
      await getOrLoadArticleSiblingId(
        legiDb,
        newLegifranceObjectCache(),
        "JORFARTI000033203048",
        1,
      ),
    ).toBe("JORFARTI000033203062")
  })

  test("getOrLoadArticleSiblingId(JORFARTI000033203048, -1)", async () => {
    expect(
      await getOrLoadArticleSiblingId(
        legiDb,
        newLegifranceObjectCache(),
        "JORFARTI000033203048",
        -1,
      ),
    ).toBe("JORFARTI000033203041")
  })
})
