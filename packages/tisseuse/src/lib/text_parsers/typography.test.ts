import { describe, expect, test } from "vitest"

import { TextParserContext } from "./parsers.js"
import {
  lettreAsciiMinuscule,
  nonLettre,
  numero,
  virguleOuEspace,
} from "./typography.js"

describe("lettreAsciiMinuscule", () => {
  test("y", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(lettreAsciiMinuscule(context)).toBe("y")
    expect(context.input).toBe("")
  })

  test("A", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(lettreAsciiMinuscule(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })

  test("é", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(lettreAsciiMinuscule(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })
})

describe("nonLettre", () => {
  test("1", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nonLettre(context)).toBe("1")
    expect(context.input).toBe("")
  })

  test("A", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nonLettre(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })

  test("œ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nonLettre(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })
})

describe("numero", () => {
  test("n°5", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(numero(context)).toBe("n° ")
    expect(context.input).toBe("5")
  })

  test("n° 5", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(numero(context)).toBe("n° ")
    expect(context.input).toBe("5")
  })
})

describe("virguleOuEspace", () => {
  test(",1", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(virguleOuEspace(context)).toBe(", ")
    expect(context.input).toBe("1")
  })

  test(", 2", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(virguleOuEspace(context)).toBe(", ")
    expect(context.input).toBe("2")
  })

  test(" 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(virguleOuEspace(context)).toBe(", ")
    expect(context.input).toBe("3")
  })

  test("4,5", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(virguleOuEspace(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })

  test("6 7", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(virguleOuEspace(context)).toBe(undefined)
    expect(context.input).toBe(task.name)
  })
})
