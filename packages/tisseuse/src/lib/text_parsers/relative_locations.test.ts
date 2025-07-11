import { describe, expect, test } from "vitest"

import { TextParserContext } from "./core.js"
import {
  adverbeRelatif,
  espaceAdverbeRelatif,
  relatifPlurielPrepose,
  relatifSingulierPrepose,
} from "./relative_locations.js"

describe("adverbeRelatif", () => {
  test("ci-avant", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(adverbeRelatif(context)).toBe(task.name)
    expect(context.input).toBe("")
  })

  test("Ci - après", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(adverbeRelatif(context)).toBe("ci-après")
    expect(context.input).toBe("")
  })
})

describe("espaceAdverbeRelatif", () => {
  test(" ci-dessous", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(espaceAdverbeRelatif(context)).toBe("ci-dessous")
    expect(context.input).toBe("")
  })

  test(" Ci- dessus", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(espaceAdverbeRelatif(context)).toBe("ci-dessus")
    expect(context.input).toBe("")
  })
})

describe("relatifPlurielPrepose", () => {
  test("premières", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(relatifPlurielPrepose(context)).toStrictEqual({ absolute: 1 })
    expect(context.input).toBe("")
  })

  test("Ces premières", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(relatifPlurielPrepose(context)).toStrictEqual({ absolute: 1 })
    expect(context.input).toBe("")
  })
})

describe("relatifSingulierPrepose", () => {
  test("avant-dernière", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(relatifSingulierPrepose(context)).toStrictEqual({ absolute: -2 })
    expect(context.input).toBe("")
  })

  test("Cette avant-dernière", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(relatifSingulierPrepose(context)).toStrictEqual({ absolute: -2 })
    expect(context.input).toBe("")
  })
})
