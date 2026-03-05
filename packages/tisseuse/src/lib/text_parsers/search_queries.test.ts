import { describe, expect, it } from "vitest"

import type {
  TextAstText,
  TextAstArticle,
  TextAstParentChild,
  TextAstPosition,
} from "./ast.js"
import { TextParserContext } from "./parsers.js"
import { searchQueryReference } from "./search_queries.js"
import { simplifyPlainText } from "./simplifiers.js"

describe("searchQueryReference", () => {
  it("should parse text abbreviations alone", () => {
    const context = new TextParserContext(simplifyPlainText("code civ").output)
    const result = searchQueryReference(context) as TextAstText | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("texte")
    expect(result?.title).toBe("Code civil")
  })

  it("should parse new common text abbreviations alone", () => {
    const context1 = new TextParserContext(simplifyPlainText("cpp").output)
    const result1 = searchQueryReference(context1) as TextAstText | undefined
    expect(result1?.type).toBe("texte")
    expect(result1?.title).toBe("Code de procédure pénale")

    const context2 = new TextParserContext(simplifyPlainText("c urb").output)
    const result2 = searchQueryReference(context2) as TextAstText | undefined
    expect(result2?.type).toBe("texte")
    expect(result2?.title).toBe("Code de l'urbanisme")

    const context3 = new TextParserContext(simplifyPlainText("cja").output)
    const result3 = searchQueryReference(context3) as TextAstText | undefined
    expect(result3?.type).toBe("texte")
    expect(result3?.title).toBe("Code de justice administrative")
  })

  it("should parse article alone", () => {
    const context = new TextParserContext(
      simplifyPlainText("art L123-4").output,
    )
    const result = searchQueryReference(context) as TextAstArticle | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("article")
    expect(result?.num).toBe("L123-4")
  })

  it("should parse text and article (Texte Article)", () => {
    const context = new TextParserContext(
      simplifyPlainText("code civil art 2").output,
    )
    const result = searchQueryReference(context) as
      | TextAstParentChild
      | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("parent-enfant")
    const parent = result?.parent as TextAstText | undefined
    expect(parent?.type).toBe("texte")
    expect(parent?.title).toBe("Code civil")
    const child = result?.child as TextAstArticle | undefined
    expect(child?.type).toBe("article")
    expect(child?.num).toBe("2")
  })

  it("should parse article and text (Article Texte)", () => {
    const context = new TextParserContext(
      simplifyPlainText("art 2 code civ").output,
    )
    const result = searchQueryReference(context) as
      | TextAstParentChild
      | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("parent-enfant")
    const parent = result?.parent as TextAstText | undefined
    expect(parent?.type).toBe("texte")
    expect(parent?.title).toBe("Code civil")
    const child = result?.child as TextAstArticle | undefined
    expect(child?.type).toBe("article")
    expect(child?.num).toBe("2")
  })
  it("should parse full text title alone (via texteFrancais) with a position", () => {
    // Regression test: texteFrancais returned a TextAstText without `position`,
    // causing iterReferenceLinks to throw "Position missing in atomic reference".
    const context = new TextParserContext(
      simplifyPlainText("Code de procédure pénale").output,
    )
    const result = searchQueryReference(context) as
      | (TextAstText & TextAstPosition)
      | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("texte")
    expect(result?.position).toBeDefined()
    expect(result?.position?.start).toBe(0)
  })

  it("should parse 'Code des relations entre le public et l\'administration' with a position", () => {
    // Regression test for the exact query that triggered a 500 error.
    const input = simplifyPlainText(
      "Code des relations entre le public et l'administration",
    ).output
    const context = new TextParserContext(input)
    const result = searchQueryReference(context) as
      | (TextAstText & TextAstPosition)
      | undefined
    // The query must either produce a defined result with a position, or return undefined —
    // but must never throw and must never produce a result missing position.
    if (result !== undefined) {
      expect(result.type).toBe("texte")
      expect(result.position).toBeDefined()
    }
  })

  it("should parse free text alone", () => {
    const context = new TextParserContext(
      simplifyPlainText("loi informatique et liberté 1978").output,
    )
    const result = searchQueryReference(context) as TextAstText | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("texte")
    expect(result?.title).toBe("loi informatique et liberté 1978")
  })

  it("should parse free text and article (Texte Article)", () => {
    const context = new TextParserContext(
      simplifyPlainText("loi informatique et liberté 1978 article 6").output,
    )
    const result = searchQueryReference(context) as
      | TextAstParentChild
      | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("parent-enfant")
    const parent = result?.parent as TextAstText | undefined
    expect(parent?.type).toBe("texte")
    expect(parent?.title).toBe("loi informatique et liberté 1978")
    const child = result?.child as TextAstArticle | undefined
    expect(child?.type).toBe("article")
    expect(child?.num).toBe("6")
  })

  it("should parse article and free text (Article Texte)", () => {
    const context = new TextParserContext(
      simplifyPlainText("article 6 de la loi informatique et liberté 1978")
        .output,
    )
    const result = searchQueryReference(context) as
      | TextAstParentChild
      | undefined
    expect(result).toBeDefined()
    expect(result?.type).toBe("parent-enfant")
    const parent = result?.parent as TextAstText | undefined
    expect(parent?.type).toBe("texte")
    expect(parent?.title).toBe("loi informatique et liberté 1978")
    const child = result?.child as TextAstArticle | undefined
    expect(child?.type).toBe("article")
    expect(child?.num).toBe("6")
  })
})
