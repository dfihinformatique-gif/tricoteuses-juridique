import { describe, expect, test } from "vitest"

import { type TextAstCountedInterval, type TextAstPortion } from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  auPortion,
  auxPortions,
  numeroPortion,
  portions,
  unePortion,
} from "./portions.js"

describe("auPortion", () => {
  test("au 2° du III", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = auPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      child: {
        id: "2°",
        index: 2,
        position: {
          start: 3,
          stop: 5,
        },
        type: "portion",
      },
      parent: {
        id: "III",
        index: 3,
        position: {
          start: 9,
          stop: 12,
        },
        type: "portion",
      },
      position: {
        start: 0,
        stop: 12,
      },
      type: "parent-enfant",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("Au dernier alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = auPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      localization: {
        absolute: -1,
      },
      position: {
        start: 0,
        stop: 17,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("auxPortions", () => {
  test("aux dix derniers alinéas", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = auxPortions(context) as TextAstPortion
    expect(result).toStrictEqual({
      count: 10,
      first: {
        localization: {
          absolute: -1,
        },
        type: "alinéa",
      },
      position: {
        start: 0,
        stop: 24,
      },
      type: "counted-interval",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("numeroPortion", () => {
  test("1°", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "1°", // TODO: Should it be "1"?
      index: 1,
      position: {
        start: 0,
        stop: 2,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("30o", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "30o", // TODO: Should it be "30"?
      index: 30,
      position: {
        start: 0,
        stop: 3,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("a", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "a",
      index: 1,
      position: {
        start: 0,
        stop: 1,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("DC", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "DC",
      index: 600,
      position: {
        start: 0,
        stop: 2,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "I",
      index: 1,
      position: {
        start: 0,
        stop: 1,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("III", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "III",
      index: 3,
      position: {
        start: 0,
        stop: 3,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("g", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = numeroPortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      id: "g",
      index: 7,
      position: {
        start: 0,
        stop: 1,
      },
      type: "portion",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("portions", () => {
  test("dix derniers alinéas", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = portions(context) as TextAstCountedInterval
    expect(result).toStrictEqual({
      count: 10,
      first: {
        localization: {
          absolute: -1,
        },
        type: "alinéa",
      },
      position: {
        start: 0,
        stop: 20,
      },
      type: "counted-interval",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("unePortion", () => {
  test("avant-dernier alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      localization: {
        absolute: -2,
      },
      position: {
        start: 0,
        stop: 20,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("même alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 11,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("nonante-et-neuvième alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 99,
      position: {
        start: 0,
        stop: 26,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("octantième alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 80,
      position: {
        start: 0,
        stop: 17,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("premier alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 1,
      position: {
        start: 0,
        stop: 14,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("premier alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 1,
      position: {
        start: 0,
        stop: 14,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("second alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 2,
      position: {
        start: 0,
        stop: 13,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("troisième alinéa", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = unePortion(context) as TextAstPortion
    expect(result).toStrictEqual({
      index: 3,
      position: {
        start: 0,
        stop: 16,
      },
      type: "alinéa",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})
