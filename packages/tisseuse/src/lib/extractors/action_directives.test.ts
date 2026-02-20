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

  test("remplacement par alinéas ainsi rédigés sur plusieurs lignes", () => {
    const line = [
      "La seconde phrase du dernier alinéa du II de l’article 224 du code général des impôts est remplacée par trois alinéas ainsi rédigés :",
      "« En cas de modification de la situation de famille du contribuable au cours de l’année d’imposition, les revenus nets sont ceux :",
      "« a) Du couple passible de la contribution ;",
      "« b) Du contribuable passible de la contribution. »",
    ].join("\n")
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("replace_portion")
    if (directive.kind === "replace_portion") {
      expect(directive.portionSelectors.length).toBeGreaterThan(0)
      expect(directive.replacementText).toContain(
        "En cas de modification de la situation de famille du contribuable",
      )
      expect(directive.replacementText).toContain("a) Du couple passible")
      expect(directive.replacementText).not.toContain("«")
      expect(directive.replacementText).not.toContain("»")
    }
  })
})
