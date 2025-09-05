import { describe, expect, test } from "vitest"

import { type TextAstCitation } from "./ast.js"
import { citation, citationLigne, citationSimple } from "./citations.js"
import { TextParserContext } from "./parsers.js"

describe("citation", () => {
  test("« l'article 1er du décret du 2 octobre 2009 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 43,
          },
        },
      ],
      position: {
        start: 0,
        stop: 45,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("« l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 43,
          },
        },
      ],
      position: {
        start: 0,
        stop: 45,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("\n")
    expect(context.text(result.position)).toBe(
      "« l'article 1er du décret du 2 octobre 2009 »",
    )
    expect(context.text(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test(" « l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 44,
          },
        },
      ],
      position: {
        start: 1,
        stop: 46,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("\n")
    expect(context.text(result.position)).toBe(
      "« l'article 1er du décret du 2 octobre 2009 »",
    )
    expect(context.text(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("« ligne 1\n« ligne 2\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 9,
          },
        },
        {
          position: {
            start: 12,
            stop: 19,
          },
        },
        {
          position: {
            start: 22,
            stop: 29,
          },
        },
      ],
      position: {
        start: 0,
        stop: 31,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.content[0].position)).toBe("ligne 1")
    expect(context.text(result.content[1].position)).toBe("ligne 2")
    expect(context.text(result.content[2].position)).toBe("ligne 3")
  })

  test("« ligne 1 »\n« ligne 2 »\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 9,
          },
        },
        {
          position: {
            start: 14,
            stop: 21,
          },
        },
        {
          position: {
            start: 26,
            stop: 33,
          },
        },
      ],
      position: {
        start: 0,
        stop: 35,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.content[0].position)).toBe("ligne 1")
    expect(context.text(result.content[1].position)).toBe("ligne 2")
    expect(context.text(result.content[2].position)).toBe("ligne 3")
  })
})

describe("citationLigne", () => {
  test("« l'article 1er du décret du 2 octobre 2009 »\n", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationLigne(context) as TextAstCitation
    expect(result).toStrictEqual({
      position: {
        start: 2,
        stop: 43,
      },
    })
    expect(context.remaining()).toBe("»\n")
    expect(context.text(result.position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("« citation\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationLigne(context) as TextAstCitation
    expect(result).toStrictEqual({
      position: {
        start: 2,
        stop: 10,
      },
    })
    expect(context.remaining()).toBe("\n« sur 2 lignes »")
    expect(context.text(result.position)).toBe("citation")
  })

  test("« citation »\n« sur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationLigne(context) as TextAstCitation
    expect(result).toStrictEqual({
      position: {
        start: 2,
        stop: 10,
      },
    })
    expect(context.remaining()).toBe("»\n« sur 2 lignes »")
    expect(context.text(result.position)).toBe("citation")
  })
})

describe("citationSimple", () => {
  test("« l'article 1er du décret du 2 octobre 2009 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationSimple(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 2,
            stop: 43,
          },
        },
      ],
      position: {
        start: 0,
        stop: 45,
      },
      type: "citation",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("« citation\nsur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationSimple(context) as TextAstCitation
    expect(result).toBe(undefined)
    expect(context.remaining()).toBe(task.name)
  })
})
