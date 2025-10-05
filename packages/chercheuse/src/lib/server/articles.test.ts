import { describe, expect, test } from "vitest"

import { getArticleDateSignature, getSiblingArticleId } from "./articles.js"
import { getOrLoadArticle, newLegalObjectCacheById } from "./loaders.js"

describe("getArticleDateSignature", async () => {
  test("getArticleDateSignature(JORFARTI000033203048)", async () => {
    const article = await getOrLoadArticle(
      newLegalObjectCacheById(),
      "JORFARTI000033203048",
    )
    expect(article).not.toBe(undefined)
    expect(await getArticleDateSignature(article!)).toBe("2016-10-07")
  })

  test("getArticleDateSignature(LEGIARTI000033205152)", async () => {
    const article = await getOrLoadArticle(
      newLegalObjectCacheById(),
      "LEGIARTI000033205152",
    )
    expect(article).not.toBe(undefined)
    expect(await getArticleDateSignature(article!)).toBe("2016-10-07")
  })
})

describe("getSiblingArticleId", async () => {
  test("getSiblingArticleId(JORFARTI000033203048, 1)", async () => {
    expect(
      await getSiblingArticleId(
        newLegalObjectCacheById(),
        "JORFARTI000033203048",
        1,
      ),
    ).toBe("JORFARTI000033203062")
  })

  test("getSiblingArticleId(JORFARTI000033203048, -1)", async () => {
    expect(
      await getSiblingArticleId(
        newLegalObjectCacheById(),
        "JORFARTI000033203048",
        -1,
      ),
    ).toBe("JORFARTI000033203041")
  })
})
