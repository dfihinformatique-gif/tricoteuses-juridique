import { describe, expect, test } from "vitest"

import { type TextAstNombre } from "./ast.js"
import {
  adverbeMultiplicatif,
  nombre,
  nombreCardinal,
  nombreOrdinal,
  nombreRomainCardinal,
  nombreRomainOrdinal,
  nombreRomainOu0i,
  romanNumeralFromNumber,
} from "./numbers.js"
import { TextParserContext } from "./parsers.js"

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

function* generateRomanNumbers(): Generator<[string, number], void> {
  for (let number = 1; number <= 101; number++) {
    yield [romanNumeralFromNumber(number), number]
  }
  yield [romanNumeralFromNumber(200), 200]
  yield [romanNumeralFromNumber(443), 443]
  yield [romanNumeralFromNumber(512), 512]
  yield [romanNumeralFromNumber(768), 768]
  yield [romanNumeralFromNumber(1001), 1001]
  yield [romanNumeralFromNumber(2018), 2018]
  yield [romanNumeralFromNumber(2023), 2023]
  yield [romanNumeralFromNumber(2222), 2222]
}

describe("adverbeMultiplicatif", () => {
  for (const [latinNumber, number] of generateLatinNumbers()) {
    test(`${latinNumber} == ${number}`, () => {
      const context = new TextParserContext(latinNumber)
      expect((adverbeMultiplicatif(context) as TextAstNombre).value).toBe(
        number,
      )
      expect(context.input).toBe("")
    })
  }
})

describe("nombre", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const cardinalNumber = number.toString()
    test(cardinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(nombre(context)).toBe(number)
      expect(context.input).toBe("")
    })
  }
})

describe("nombreCardinal", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const cardinalNumber = number.toString()
    test(cardinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(nombreCardinal(context)).toBe(number)
      expect(context.input).toBe("")
    })
  }
})

describe("nombreOrdinal", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const ordinalNumber =
      number.toString() +
      (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(ordinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(nombreOrdinal(context)).toBe(number)
      expect(context.input).toBe("")
    })
  }
})

describe("nombreRomainCardinal", () => {
  for (const [romanNumber, number] of generateRomanNumbers()) {
    test(`${romanNumber} == ${number}`, () => {
      const context = new TextParserContext(romanNumber)
      expect(nombreRomainCardinal(context) as TextAstNombre).toBe(number)
      expect(context.input).toBe("")
    })
  }
})

describe("nombreRomainOrdinal", () => {
  for (const [romanNumber, number] of generateRomanNumbers()) {
    const ordinalRomanNumber =
      romanNumber + (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(`${ordinalRomanNumber} == ${number}`, () => {
      const context = new TextParserContext(ordinalRomanNumber)
      expect(nombreRomainOrdinal(context) as TextAstNombre).toBe(number)
      expect(context.input).toBe("")
    })
  }
})

describe("nombreRomainOu0i", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0i(context)).toBe(0)
    expect(context.input).toBe("")
  })
  for (const [romanNumber, number] of generateRomanNumbers()) {
    test(`${romanNumber} == ${number}`, () => {
      const context = new TextParserContext(romanNumber)
      expect(nombreRomainOu0i(context) as TextAstNombre).toBe(number)
      expect(context.input).toBe("")
    })
    const ordinalRomanNumber =
      romanNumber + (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(`${ordinalRomanNumber} == ${number}`, () => {
      const context = new TextParserContext(ordinalRomanNumber)
      expect(nombreRomainOu0i(context) as TextAstNombre).toBe(number)
      expect(context.input).toBe("")
    })
  }
})
