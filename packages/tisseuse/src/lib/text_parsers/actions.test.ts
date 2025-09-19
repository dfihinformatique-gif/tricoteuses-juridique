import { describe, expect, test } from "vitest"

import { action } from "./actions.js"
import { TextParserContext } from "./parsers.js"

describe("actions", () => {
  describe("CREATION", () => {
    test(" est complété", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(", est insérée", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(", il est inséré", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(", sont insérés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("CREATION_OU_MODIFICATION", () => {
    test(" est ainsi rédigé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION_OU_MODIFICATION",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("MODIFICATION", () => {
    test(" est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(", est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(" est modifié comme suit", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(" est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.remaining()).toBe("")
    })

    test(" les mots : « la marine marchande » sont remplacés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
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
        action: "MODIFICATION",
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

  describe("SUPPRESSION", () => {
    test(" est supprimé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "SUPPRESSION",
      })
      expect(context.remaining()).toBe("")
    })

    test(", les mots : « Chambertin-Clos de Bèze » sont supprimés", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "SUPPRESSION",
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
        action: "SUPPRESSION",
        actionInContent: true,
      })
      expect(context.remaining()).toBe("")
    })
  })
  // describe("actions après objet", () => {
  //   test("Il est rétabli dans", ({ task }) => {
  //     const context = new TextParserContext(task.name)
  //     expect(action(context)).toStrictEqual({
  //       action: "CREATION",
  //     })
  //     expect(context.remaining()).toBe("")
  //   })
  // })
})
