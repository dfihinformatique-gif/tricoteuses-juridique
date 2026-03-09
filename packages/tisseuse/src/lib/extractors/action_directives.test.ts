import { describe, expect, test } from "vitest"

import type { TextAstReference } from "../text_parsers/ast.js"
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

  test("suppression de plusieurs references citees", () => {
    const line =
      "Au b du 2 de l’article 200-0 A, les références : « 199 quater F, » et « 199 vicies A, » sont supprimées ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(2)
    const targets = directives
      .filter((directive) => directive.kind === "delete")
      .map((directive) =>
        directive.kind === "delete" ? directive.targetText : "",
      )
    expect(targets).toContain("199 quater F,")
    expect(targets).toContain("199 vicies A,")
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

  test("liste d'items dans un bloc modifie", () => {
    const line = [
      "II. – L’article 10 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025 est ainsi modifié :",
      "1° Après le III, il est inséré un III bis ainsi rédigé :",
      "« III bis. – Exemple d’insertion. »",
      "2° Le A du IV est remplacé par les dispositions suivantes :",
      "« A. – Exemple de remplacement. »",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(2)

    const insertDirective = directives.find(
      (directive) => directive.kind === "insert_after",
    )
    expect(insertDirective).toBeDefined()
    if (insertDirective?.kind === "insert_after") {
      expect(insertDirective.insertText).toContain("III bis")
      expect(insertDirective.portionSelectors.length).toBeGreaterThan(0)
    }

    const replaceDirective = directives.find(
      (directive) => directive.kind === "replace_portion",
    )
    expect(replaceDirective).toBeDefined()
    if (replaceDirective?.kind === "replace_portion") {
      expect(replaceDirective.replacementText).toContain(
        "Exemple de remplacement",
      )
      expect(replaceDirective.portionSelectors.length).toBeGreaterThan(0)
    }
  })

  test("liste d'items avec numerotation romaine", () => {
    const line = [
      "L’article 48 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025 est ainsi modifié :",
      "I. – Au I, les mots : « du premier exercice » sont remplacés par les mots : « des deux premiers exercices » ;",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("replace")
    if (directive.kind === "replace") {
      expect(directive.targetText).toBe("du premier exercice")
      expect(directive.replacementText).toBe("des deux premiers exercices")
      expect(directive.portionSelectors.length).toBeGreaterThan(0)
    }
  })

  test("retablissement d'une section avec citation multilignes", () => {
    const line = [
      "Au chapitre III du titre Ier de la première partie du livre premier, la section X est ainsi rétablie :",
      "« Section X",
      "« Taxe sur les actifs non affectés à une activité opérationnelle des sociétés holdings patrimoniales",
      "« Art. 235 ter C. – I. – A. – Il est institué une taxe sur les actifs non professionnels détenus",
      "« 1° Exemple de condition. »",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("insert_after")
    if (directive.kind === "insert_after") {
      expect(directive.insertText).toContain("Section X")
      expect(directive.insertText).toContain("Art. 235 ter C")
      expect(directive.insertText).not.toContain("«")
      expect(directive.insertText).not.toContain("»")
    }
  })

  test("liste imbriquee avec contexte de portion", () => {
    const line = [
      "L’article 48 de la loi n° 2025-127 du 14 février 2025 de finances pour 2025 est ainsi modifié :",
      "II. – Au IV :",
      "1° Au A :",
      "a) Le premier alinéa est complété par les mots : « pour le premier exercice clos à compter du 31 décembre 2025 et à 10,3 % pour l’exercice suivant » ;",
      "b) Au deuxième alinéa, après les mots : « inférieur à 1,1 milliard d’euros », sont insérés les mots : « et pour les redevables dont le chiffre d’affaires au titre de l’un de ces deux exercices est inférieur à 1 milliard d’euros » ;",
      "2° Au B :",
      "a) Le premier alinéa est complété par les mots : « pour le premier exercice clos à compter du 31 décembre 2025 et à 20,6 % pour l’exercice suivant » ;",
      "b) Au deuxième alinéa, après les mots : « inférieur à 3,1 milliards d’euros », sont insérés les mots : « et pour les redevables dont le chiffre d’affaires au titre de l’un de ces deux exercices est inférieur à 3 milliards d’euros » ;",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(4)

    const first = directives[0]
    expect(first.kind).toBe("insert_after")
    if (first.kind === "insert_after") {
      const steps = first.portionSelectors.flatMap((selector) =>
        selector.kind === "single"
          ? selector.steps
          : [...selector.first, ...selector.last],
      )
      const nums = steps.flatMap((step) => ("num" in step ? [step.num] : []))
      expect(nums).toContain("IV")
      expect(nums).toContain("A")
    }

    const second = directives[1]
    expect(second.kind).toBe("insert_after")
    if (second.kind === "insert_after") {
      const steps = second.portionSelectors.flatMap((selector) =>
        selector.kind === "single"
          ? selector.steps
          : [...selector.first, ...selector.last],
      )
      const nums = steps.flatMap((step) => ("num" in step ? [step.num] : []))
      expect(nums).toContain("IV")
      expect(nums).toContain("A")
    }

    const third = directives[2]
    expect(third.kind).toBe("insert_after")
    if (third.kind === "insert_after") {
      const steps = third.portionSelectors.flatMap((selector) =>
        selector.kind === "single"
          ? selector.steps
          : [...selector.first, ...selector.last],
      )
      const nums = steps.flatMap((step) => ("num" in step ? [step.num] : []))
      expect(nums).toContain("IV")
      expect(nums).toContain("B")
    }

    const fourth = directives[3]
    expect(fourth.kind).toBe("insert_after")
    if (fourth.kind === "insert_after") {
      const steps = fourth.portionSelectors.flatMap((selector) =>
        selector.kind === "single"
          ? selector.steps
          : [...selector.first, ...selector.last],
      )
      const nums = steps.flatMap((step) => ("num" in step ? [step.num] : []))
      expect(nums).toContain("IV")
      expect(nums).toContain("B")
    }
  })

  test("suppression de portion sans citation explicite", () => {
    const line = "Le 5° du 1 de l’article 93 est abrogé ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("delete_portion")
    expect(directive.portionSelectors.length).toBeGreaterThan(0)
  })

  test("liste imbriquee sans reference d'article dans l'intro", () => {
    const line = [
      "Le code général des impôts est ainsi modifié :",
      "4° A l’article 81 :",
      "a) Le 7° est abrogé ;",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("delete_portion")
    const steps = directive.portionSelectors.flatMap((selector) =>
      selector.kind === "single"
        ? selector.steps
        : [...selector.first, ...selector.last],
    )
    const nums = steps.flatMap((step) => ("num" in step ? [step.num] : []))
    expect(nums).toContain("7°")
    const collectArticleNums = (reference: TextAstReference): string[] => {
      if (reference.type === "article") {
        return reference.num ? [reference.num] : []
      }
      if (reference.type === "parent-enfant") {
        return [
          ...collectArticleNums(reference.parent),
          ...collectArticleNums(reference.child),
        ]
      }
      if (reference.type === "bounded-interval") {
        return [
          ...collectArticleNums(reference.first),
          ...collectArticleNums(reference.last),
        ]
      }
      if (reference.type === "counted-interval") {
        return collectArticleNums(reference.first)
      }
      if (reference.type === "enumeration") {
        return [
          ...collectArticleNums(reference.left),
          ...collectArticleNums(reference.right),
        ]
      }
      if (reference.type === "exclusion") {
        return collectArticleNums(reference.left)
      }
      if (reference.type === "reference_et_action") {
        return collectArticleNums(reference.reference)
      }
      return []
    }
    const articleNums = collectArticleNums(directive.reference)
    expect(articleNums).toContain("81")
  })
})
