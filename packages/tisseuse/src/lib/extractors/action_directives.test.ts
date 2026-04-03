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

  test("suppression avec occurrence ciblee", () => {
    const line =
      "À l’article 157 bis, au premier alinéa, les mots : « âgé de plus de soixante-cinq ans au 31 décembre de l’année d’imposition, ou » et la seconde occurrence du signe : « , » sont supprimés ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(2)
    const commaDirective = directives.find(
      (directive) => directive.kind === "delete" && directive.targetText === ",",
    )
    expect(commaDirective).toBeDefined()
    if (commaDirective?.kind === "delete") {
      expect(commaDirective.occurrenceIndex).toBe(2)
    }
  })

  test("article abroge", () => {
    const line = "L’article 220 quater est abrogé ;"
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("delete_article")
  })

  test("article abroge dans une liste sous contexte de texte", () => {
    const line = [
      "I. – Le code général des impôts est ainsi modifié :",
      "1° L’article 39 AH est abrogé ;",
    ].join("\n")
    const directives = extractActionDirectivesFromText(line)
    expect(directives).toHaveLength(1)
    const directive = directives[0]
    expect(directive.kind).toBe("delete_article")
    if (directive.kind === "delete_article") {
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
      expect(collectArticleNums(directive.reference)).toContain("39 AH")
    }
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

  test("liste imbriquee avec contexte d'item numerique", () => {
    const line = [
      "B. – Au 5 de l’article 158 :",
      "1° Le a est ainsi modifié :",
      "a) A la première phrase du deuxième alinéa, les mots : « et retraites » sont remplacés par les mots : « , autres que les pensions de retraite, » ;",
      "b) A la deuxième phrase du même alinéa, les mots : « et retraites » sont supprimés ;",
      "c) A la première phrase du dernier alinéa, les mots : « et retraites » et, à la deuxième phrase du même alinéa, les mots : « ou retraites » et les mots : « retraité ou », sont supprimés ;",
      "2° Après le a, il est inséré un a bis ainsi rédigé :",
      "« a bis) Exemple d’insertion. » ;",
      "3° Au b bis, après les mots : « du a », sont insérés les mots : « , et du a bis pour les prestations de retraites, » ;",
      "4° Le b quinquies est ainsi modifié :",
      "a) Au premier alinéa, la référence : « a » est remplacée par la référence : « a bis » ;",
      "b) Au 1°, la référence : « deuxième alinéa du a » est remplacée par la référence : « a bis » ;",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    expect(directives.length).toBeGreaterThanOrEqual(7)

    const extractNums = (directive: { portionSelectors: unknown[] }): string[] => {
      const selectors = directive.portionSelectors as Array<
        | { kind: "single"; steps: Array<{ num?: string }> }
        | { kind: "range"; first: Array<{ num?: string }>; last: Array<{ num?: string }> }
      >
      return selectors.flatMap((selector) =>
        selector.kind === "single"
          ? selector.steps
          : [...selector.first, ...selector.last],
      ).flatMap((step) => (step.num ? [step.num] : []))
    }

    const directiveWithItem = directives.find((directive) =>
      extractNums(directive).includes("a"),
    )
    expect(directiveWithItem).toBeDefined()
    if (directiveWithItem) {
      const nums = extractNums(directiveWithItem)
      expect(nums).toContain("5")
      expect(nums).toContain("a")
    }

    const insertAfterADirective = directives.find((directive) => {
      if (directive.kind !== "insert_after") return false
      return directive.insertText.includes("a bis)")
    })
    expect(insertAfterADirective).toBeDefined()
    if (insertAfterADirective?.kind === "insert_after") {
      const nums = extractNums(insertAfterADirective)
      expect(nums).toContain("5")
      expect(nums).toContain("a")
    }

    const bBisDirective = directives.find((directive) => {
      if (directive.kind !== "insert_after") return false
      return directive.targetText === "du a"
    })
    expect(bBisDirective).toBeDefined()
    if (bBisDirective) {
      const nums = extractNums(bBisDirective)
      expect(nums).toContain("5")
      expect(nums).toContain("b bis")
      expect(nums).not.toContain("a")
    }

    const bQuinquiesDirective = directives.find((directive) => {
      if (directive.kind !== "replace") return false
      return directive.targetText === "a"
    })
    expect(bQuinquiesDirective).toBeDefined()
    if (bQuinquiesDirective) {
      const nums = extractNums(bQuinquiesDirective)
      expect(nums).toContain("5")
      expect(nums).toContain("b quinquies")
      expect(nums).not.toContain("a")
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

  test("remplacement de plusieurs phrases sous contexte d'alinéa", () => {
    const line = [
      "A. – A l’article 199 undecies B :",
      "1° Au I :",
      "b) Au dix-septième alinéa :",
      "ii) Les deuxième et troisième phrases sont remplacées par une phrase ainsi rédigée : « Pour les investissements consistant en la construction ou la réalisation de travaux de rénovation ou de réhabilitation d’hôtel, de résidence de tourisme et de village de vacances classés, l’assiette de la réduction d’impôt prévue à la première phrase du présent alinéa est retenue dans la limite de 7 000 € hors taxes par mètre carré de surface habitable. » ;",
    ].join("\n")

    const directives = extractActionDirectivesFromText(line)
    const directive = directives.find(
      (candidate) => candidate.kind === "replace_portion",
    )
    expect(directive).toBeDefined()
    if (directive?.kind === "replace_portion") {
      const rangeSelector = directive.portionSelectors.find(
        (selector) => selector.kind === "range",
      )
      expect(rangeSelector).toBeDefined()
      if (rangeSelector?.kind === "range") {
        const nums = [...rangeSelector.first, ...rangeSelector.last].flatMap(
          (step) => ("num" in step && step.num ? [step.num] : []),
        )
        expect(nums).toContain("I")
        expect(rangeSelector.first.at(-1)?.type).toBe("phrase")
        expect(rangeSelector.first.at(-1)?.index).toBe(2)
        expect(rangeSelector.last.at(-1)?.type).toBe("phrase")
        expect(rangeSelector.last.at(-1)?.index).toBe(3)
      }
    }
  })
})
