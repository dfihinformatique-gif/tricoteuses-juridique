import { describe, expect, test } from "vitest"

import { TextParserContext, type TextAstAdverbeMultiplicatif } from "./core.js"
import {
  adverbeMultiplicatif,
  nombre,
  nombreCardinal,
  nombreOrdinal,
  nombreRomainOu0i,
} from "./numbers.js"

function* generateLatinNumbers(): Generator<[string, number], void> {
  const units: Record<string, string[]> = {
    1: ["semel"],
    2: ["bis"],
    3: ["ter"],
    4: ["quater"],
    5: ["quinquies"],
    6: ["sexies"],
    7: ["septies"],
    8: ["octies"],
    9: ["nonies", "novies"],
  }
  const decades: Record<string, string[]> = {
    10: ["decies"],
    20: ["vicies", "vecies"],
    30: ["tricies", "trecies"],
    40: ["quadragies"],
    50: ["quinquagies"],
    60: ["sexagies"],
    70: ["septuagies"],
    80: ["octogies"],
    90: ["nonagies"],
  }
  const unitDecades: Record<string, string> = {
    0: "",
    1: "un",
    2: "du", // duo
    3: "ter",
    4: "quater",
    5: "quin",
    6: "sex",
    7: "sept",
    8: "oct", // octo
    9: "nov", // novo
  }
  for (let i = 1; i < 100; i++) {
    if (i < 10) {
      for (const n of units[i]) {
        yield [n, i]
      }
    } else {
      for (const decade of decades[i - (i % 10)]) {
        yield [
          unitDecades[i % 10] +
            ((i % 10 === 2 || i % 10 === 8 || i % 10 === 9) && decade[0] !== "o"
              ? "o"
              : "") +
            decade,
          i,
        ]
      }
      if (i % 10 === 8 && i >= 18 && i <= 88) {
        for (const decade of decades[i - (i % 10) + 10]) {
          yield ["duod" + (decade[0] === "o" ? "" : "e") + decade, i]
        }
      } else if (i % 10 === 9 && i >= 19 && i <= 89) {
        for (const decade of decades[i - (i % 10) + 10]) {
          yield ["und" + (decade[0] === "o" ? "" : "e") + decade, i]
        }
      }
    }
  }
}

describe("nombre", () => {
  test("1", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombre(context)).toBe(1)
    expect(context.input).toBe("")
  })

  test("1er", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombre(context)).toBe(1)
    expect(context.input).toBe("")
  })

  test("2", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombre(context)).toBe(2)
    expect(context.input).toBe("")
  })

  test("2ème", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombre(context)).toBe(2)
    expect(context.input).toBe("")
  })
})

describe("nombreCardinal", () => {
  test("1", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreCardinal(context)).toBe(1)
    expect(context.input).toBe("")
  })

  test("2", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreCardinal(context)).toBe(2)
    expect(context.input).toBe("")
  })
})

describe("nombreOrdinal", () => {
  test("1er", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreOrdinal(context)).toBe(1)
    expect(context.input).toBe("")
  })

  test("2ème", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreOrdinal(context)).toBe(2)
    expect(context.input).toBe("")
  })
})

describe("nombreRomainOu0i", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0i(context)).toBe(0)
    expect(context.input).toBe("")
  })

  test("I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0i(context)).toBe(1)
    expect(context.input).toBe("")
  })
  test("Ier", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0i(context)).toBe(1)
    expect(context.input).toBe("")
  })
  test("CXIème", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0i(context)).toBe(111)
    expect(context.input).toBe("")
  })
})

describe("adverbeMultiplicatif", () => {
  for (const [latinNumber, number] of generateLatinNumbers()) {
    test(`${latinNumber} === ${number}`, () => {
      const context = new TextParserContext(latinNumber)
      expect(
        (adverbeMultiplicatif(context) as TextAstAdverbeMultiplicatif).order,
      ).toBe(number)
      expect(context.input).toBe("")
    })
  }
})
