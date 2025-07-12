import { describe, expect, test } from "vitest"

import { action } from "./actions.js"
import { TextParserContext } from "./core.js"

describe("actions", () => {
  describe("CREATION", () => {
    test(" est complété", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.input).toBe("")
    })

    test(", est insérée", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.input).toBe("")
    })

    test(", il est inséré", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.input).toBe("")
    })

    test(", sont insérés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION",
      })
      expect(context.input).toBe("")
    })
  })

  describe("CREATION_OU_MODIFICATION", () => {
    test(" est ainsi rédigé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "CREATION_OU_MODIFICATION",
      })
      expect(context.input).toBe("")
    })
  })

  describe("MODIFICATION", () => {
    test(" est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.input).toBe("")
    })

    test(", est ainsi modifié", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.input).toBe("")
    })

    test(" est modifié comme suit", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.input).toBe("")
    })

    test(" est remplacé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
      })
      expect(context.input).toBe("")
    })

    test(" les mots : « la marine marchande » sont remplacés", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
        actionInContent: true,
      })
      expect(context.input).toBe("")
    })

    test(", les nombres : « vingt-quatre » et « vingt-sept » sont respectivement remplacés", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "MODIFICATION",
        actionInContent: true,
      })
      expect(context.input).toBe("")
    })
  })

  describe("SUPPRESSION", () => {
    test(" est supprimé", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "SUPPRESSION",
      })
      expect(context.input).toBe("")
    })

    test(", les mots : « Chambertin-Clos de Bèze » sont supprimés", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "SUPPRESSION",
        actionInContent: true,
      })
      expect(context.input).toBe("")
    })

    test(", est supprimée la mention", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(action(context)).toStrictEqual({
        action: "SUPPRESSION",
        actionInContent: true,
      })
      expect(context.input).toBe("")
    })
  })
  // describe("actions après objet", () => {
  //   test("Il est rétabli dans", ({ task }) => {
  //     const context = new TextParserContext(task.name)
  //     expect(action(context)).toStrictEqual({
  //       action: "CREATION",
  //     })
  //     expect(context.input).toBe("")
  //   })
  // })
})
