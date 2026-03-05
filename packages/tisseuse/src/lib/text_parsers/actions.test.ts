import { describe, expect, test } from "vitest"

import { action, preAction } from "./actions.js"
import { TextParserContext } from "./parsers.js"

describe("preAction", () => {
  test('détecte "modalités d\'application " comme précision (pluriel)', () => {
    const context = new TextParserContext(
      "modalités d'application des articles L. 931-3-9",
    )
    context.offset = 24 // position of "des"
    expect(preAction(context)).toStrictEqual({
      action: "précision",
    })
    expect(context.offset).toBe(24) // offset unchanged (zero-width)
  })

  test('détecte "conditions d\'application " comme précision (pluriel)', () => {
    const context = new TextParserContext(
      "conditions d'application des articles L. 135-1",
    )
    context.offset = 25 // position of "des"
    expect(preAction(context)).toStrictEqual({
      action: "précision",
    })
    expect(context.offset).toBe(25)
  })

  test('détecte "modalités d\'application de " comme précision (singulier)', () => {
    const context = new TextParserContext(
      "modalités d'application de l'article 5",
    )
    context.offset = 27 // position of "l'"
    expect(preAction(context)).toStrictEqual({
      action: "précision",
    })
    expect(context.offset).toBe(27)
  })

  test('détecte "conditions d\'application de " comme précision (singulier)', () => {
    const context = new TextParserContext(
      "conditions d'application de l'article 9",
    )
    context.offset = 28 // position of "l'"
    expect(preAction(context)).toStrictEqual({
      action: "précision",
    })
    expect(context.offset).toBe(28)
  })

  test('détecte "en application " comme application (pluriel)', () => {
    const context = new TextParserContext(
      "en application des articles L. 135-1",
    )
    context.offset = 15 // position of "des"
    expect(preAction(context)).toStrictEqual({
      action: "application",
    })
    expect(context.offset).toBe(15)
  })

  test('détecte "en application de " comme application (singulier)', () => {
    const context = new TextParserContext(
      "en application de l'article L. 135-1",
    )
    context.offset = 18 // position of "l'"
    expect(preAction(context)).toStrictEqual({
      action: "application",
    })
    expect(context.offset).toBe(18)
  })

  test("ne détecte rien quand le contexte avant ne contient pas d'application", () => {
    const context = new TextParserContext(
      "les modalités des articles L. 931-3-9",
    )
    context.offset = 15 // position of "des"
    expect(preAction(context)).toBeUndefined()
  })

  test("ne détecte rien au début du texte", () => {
    const context = new TextParserContext("des articles L. 931-3-9")
    context.offset = 0
    expect(preAction(context)).toBeUndefined()
  })
})

describe("actions", () => {
  describe("ajouter / compléter / insérer / rétablir", () => {
    test(" est complété", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "compléter",
      })
      expect(context.remaining()).toBe("")
    })

    test(", est insérée", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "insérer",
      })
      expect(context.remaining()).toBe("")
    })

    test(", il est inséré", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "insérer",
      })
      expect(context.remaining()).toBe("")
    })

    test(", sont insérés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "insérer",
      })
      expect(context.remaining()).toBe("")
    })

    test(", après le mot : « informations », sont insérés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "insérer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 19,
                  stop: 31,
                },
              },
            ],
            position: {
              start: 17,
              stop: 33,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(" est rétabli", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "rétablir",
      })
      expect(context.remaining()).toBe("")
    })

    test(", est complété par les mots : « foo »", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toMatchObject({
        action: "compléter",
        actionInContent: true,
        originalCitations: [
          {
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(", « article 73 », sont insérés les mots", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "ajouter",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 4,
                  stop: 14,
                },
              },
            ],
            position: {
              start: 2,
              stop: 16,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(", « 231 quater », il est inséré la référence", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "insérer",
        actionInContent: true,
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("rédiger", () => {
    test(" est ainsi rédigé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "rédiger",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("modifier / remplacer / devenir / renuméroter", () => {
    test(" est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "modifier",
      })
      expect(context.remaining()).toBe("")
    })

    test(", est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "modifier",
      })
      expect(context.remaining()).toBe("")
    })

    test(" est modifié comme suit", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "modifier",
      })
      expect(context.remaining()).toBe("")
    })

    test(" est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
      })
      expect(context.remaining()).toBe("")
    })

    test(", le mot : « doit » est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 13,
                  stop: 17,
                },
              },
            ],
            position: {
              start: 11,
              stop: 19,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(" devient", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "devenir",
      })
      expect(context.remaining()).toBe("")
    })

    test(", le montant de 523 millions est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
        actionInContent: true,
      })
      expect(context.remaining()).toBe("")
    })

    test(", « montant 1 » est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 4,
                  stop: 13,
                },
              },
            ],
            position: {
              start: 2,
              stop: 15,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(" les mots : « la marine marchande » sont remplacés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 14,
                  stop: 33,
                },
              },
            ],
            position: {
              start: 12,
              stop: 35,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(", les nombres : « vingt-quatre » et « vingt-sept » sont respectivement remplacés", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "remplacer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 18,
                  stop: 30,
                },
              },
            ],
            position: {
              start: 16,
              stop: 32,
            },
            type: "citation",
          },
          {
            content: [
              {
                position: {
                  start: 38,
                  stop: 48,
                },
              },
            ],
            position: {
              start: 36,
              stop: 50,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("supprimer / abroger", () => {
    test(" est supprimé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "supprimer",
      })
      expect(context.remaining()).toBe("")
    })

    test(" sont supprimées", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "supprimer",
      })
      expect(context.remaining()).toBe("")
    })

    test(", les mots : « Chambertin-Clos de Bèze » sont supprimés", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "supprimer",
        actionInContent: true,
        originalCitations: [
          {
            content: [
              {
                position: {
                  start: 15,
                  stop: 38,
                },
              },
            ],
            position: {
              start: 13,
              stop: 40,
            },
            type: "citation",
          },
        ],
      })
      expect(context.remaining()).toBe("")
    })

    test(", est supprimée la mention", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "supprimer",
        actionInContent: true,
      })
      expect(context.remaining()).toBe("")
    })
  })
  // describe("actions après objet", () => {
})
