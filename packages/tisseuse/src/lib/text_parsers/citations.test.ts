import { describe, expect, test } from "vitest"

import { TextParserContext } from "./core.js"
import { citation, citationLigne, citationSimple } from "./citations.js"

describe("citation", () => {
  test("« l'article 1er du décret du 2 octobre 2009 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citation(context)).toStrictEqual({
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
      text: task.name,
      type: "citation",
    })
    expect(context.input).toBe("")
  })

  test("« l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citation(context)).toStrictEqual({
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
    expect(context.input).toBe("\n")
  })

  test(" « l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citation(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 44,
          },
          text: "l'article 1er du décret du 2 octobre 2009",
        },
      ],
      position: {
        start: 1,
        stop: 46,
      },
      text: "« l'article 1er du décret du 2 octobre 2009 »",
      type: "citation",
    })
    expect(context.input).toBe("\n")
  })

  test("\n« ligne 1\n« ligne 2\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citation(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 10,
          },
          text: "ligne 1",
        },
        {
          position: {
            start: 13,
            stop: 20,
          },
          text: "ligne 2",
        },
        {
          position: {
            start: 23,
            stop: 30,
          },
          text: "ligne 3",
        },
      ],
      position: {
        start: 0,
        stop: 32,
      },
      text: task.name,
      type: "citation",
    })
    expect(context.input).toBe("")
  })

  test("\n« ligne 1 »\n« ligne 2 »\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citation(context)).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 10,
          },
          text: "ligne 1",
        },
        {
          position: {
            start: 15,
            stop: 22,
          },
          text: "ligne 2",
        },
        {
          position: {
            start: 27,
            stop: 34,
          },
          text: "ligne 3",
        },
      ],
      position: {
        start: 0,
        stop: 36,
      },
      text: task.name,
      type: "citation",
    })
    expect(context.input).toBe("")
  })
})

describe("citationLigne", () => {
  test("« l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      position: {
        start: 2,
        stop: 43,
      },
      text: "l'article 1er du décret du 2 octobre 2009",
    })
    expect(context.input).toBe("»\n")
  })

  test("« citation\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      position: {
        start: 2,
        stop: 10,
      },
      text: "citation",
    })
    expect(context.input).toBe("\n« sur 2 lignes »")
  })

  test("« citation »\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(citationLigne(context)).toStrictEqual({
      position: {
        start: 2,
        stop: 10,
      },
      text: "citation",
    })
    expect(context.input).toBe("»\n« sur 2 lignes »")
  })
})

describe("citationSimple", () => {
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
