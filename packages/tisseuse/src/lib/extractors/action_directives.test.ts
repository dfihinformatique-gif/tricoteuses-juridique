import { describe, expect, test } from "vitest"

import { extractActionDirectivesFromText } from "./action_directives.js"

describe("extractActionDirectivesFromText", () => {
  test("apres la reference ... il est insere la reference", () => {
    const line =
      "Au premier alinéa du 4° du 1 de l’article 39, après la référence : « 231 quater », il est inséré la référence : « 235 ter C, » ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("insert_after")
    if (directive.kind === "insert_after") {
      expect(directive.targetText).toBe("231 quater")
      expect(directive.insertText).toBe("235 ter C,")
    }
  })

  test("reference remplacee par reference", () => {
    const line =
      "Au premier alinéa de l’article 200, la référence : « 199 quater F » est remplacée par la référence : « 199 septies » ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("replace")
    if (directive.kind === "replace") {
      expect(directive.targetText).toBe("199 quater F")
      expect(directive.replacementText).toBe("199 septies")
    }
  })

  test("article abroge", () => {
    const line = "L’article 220 quater est abrogé ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("delete_article")
  })
})
