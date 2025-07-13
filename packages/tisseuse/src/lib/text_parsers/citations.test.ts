import { describe, expect, test } from "vitest"

import { TextParserContext, type TextAstCitation } from "./core.js"
import { citation, citationLigne, citationSimple } from "./citations.js"

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
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.content[0].position)).toBe(
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
    expect(context.input).toBe("\n")
    expect(context.textSlice(result.position)).toBe(
      "« l'article 1er du décret du 2 octobre 2009 »",
    )
    expect(context.textSlice(result.content[0].position)).toBe(
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
    expect(context.input).toBe("\n")
    expect(context.textSlice(result.position)).toBe(
      "« l'article 1er du décret du 2 octobre 2009 »",
    )
    expect(context.textSlice(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("\n« ligne 1\n« ligne 2\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 10,
          },
        },
        {
          position: {
            start: 13,
            stop: 20,
          },
        },
        {
          position: {
            start: 23,
            stop: 30,
          },
        },
      ],
      position: {
        start: 0,
        stop: 32,
      },
      type: "citation",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.content[0].position)).toBe("ligne 1")
    expect(context.textSlice(result.content[1].position)).toBe("ligne 2")
    expect(context.textSlice(result.content[2].position)).toBe("ligne 3")
  })

  test("\n« ligne 1 »\n« ligne 2 »\n« ligne 3 »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citation(context) as TextAstCitation
    expect(result).toStrictEqual({
      content: [
        {
          position: {
            start: 3,
            stop: 10,
          },
        },
        {
          position: {
            start: 15,
            stop: 22,
          },
        },
        {
          position: {
            start: 27,
            stop: 34,
          },
        },
      ],
      position: {
        start: 0,
        stop: 36,
      },
      type: "citation",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.content[0].position)).toBe("ligne 1")
    expect(context.textSlice(result.content[1].position)).toBe("ligne 2")
    expect(context.textSlice(result.content[2].position)).toBe("ligne 3")
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
    expect(context.input).toBe("»\n")
    expect(context.textSlice(result.position)).toBe(
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
    expect(context.input).toBe("\n« sur 2 lignes »")
    expect(context.textSlice(result.position)).toBe("citation")
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
    expect(context.input).toBe("»\n« sur 2 lignes »")
    expect(context.textSlice(result.position)).toBe("citation")
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
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.content[0].position)).toBe(
      "l'article 1er du décret du 2 octobre 2009",
    )
  })

  test("« citation\nsur 2 lignes »", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = citationSimple(context) as TextAstCitation
    expect(result).toBe(undefined)
    expect(context.input).toBe(task.name)
  })
})
