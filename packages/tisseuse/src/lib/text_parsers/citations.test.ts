import { describe, expect, test } from "vitest"

import { TextParserContext } from "./core.js"
import { citationLigne, citationSimple } from "./citations.js"

describe("citationLigne", function () {
  test("« l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 43,
          },
          text: "l'article 1er du décret du 2 octobre 2009",
        },
      ],
      position: {
        start: 0,
        stop: 46,
      },
      text: "« l'article 1er du décret du 2 octobre 2009 »\n",
      type: "citation",
    })
    expect(context.input).toBe("")
  })

  test("« citation\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 10,
          },
          text: "citation",
        },
      ],
      position: {
        start: 0,
        stop: 11,
      },
      text: "« citation\n",
      type: "citation",
    })
    expect(context.input).toBe("« sur 2 lignes »")
  })

  test("« citation »\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 10,
          },
          text: "citation",
        },
      ],
      position: {
        start: 0,
        stop: 13,
      },
      text: "« citation »\n",
      type: "citation",
    })
    expect(context.input).toBe("« sur 2 lignes »")
  })
})

describe("citationSimple", function () {
  test("« l'article 1er du décret du 2 octobre 2009 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationSimple(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 43,
          },
          text: "l'article 1er du décret du 2 octobre 2009",
        },
      ],
      position: {
        start: 0,
        stop: 45,
      },
      text: "« l'article 1er du décret du 2 octobre 2009 »",
      type: "citation",
    })
    expect(context.input).toBe("")
  })

  test("« citation\nsur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationSimple(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })
})
