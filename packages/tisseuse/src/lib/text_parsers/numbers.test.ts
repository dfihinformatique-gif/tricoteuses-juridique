import {
  iterLatinMultiplicativeAdverbsFromNumber,
  romanNumeralFromNumber,
} from "@tricoteuses/legifrance"
import { describe, expect, test } from "vitest"

import { type TextAstNumber } from "./ast.js"
import {
  adjectifNumeralOrdinalCourt,
  adverbeMultiplicatifLatin,
  nombreAsTextAstNumber,
  nombreCardinal,
  nombreRomainCardinal,
  nombreRomainOrdinal,
  nombreRomainOu0iAsTextAstNumber,
} from "./numbers.js"
import { TextParserContext } from "./parsers.js"

function* generateLatinMultiplicativeAdverbs(): Generator<
  [string, number],
  void
> {
  for (let num = 1; num < 100; num++) {
    for (const adverb of iterLatinMultiplicativeAdverbsFromNumber(num)) {
      yield [adverb, num]
    }
  }
}

function* generateRomanNumbers(): Generator<[string, number], void> {
  for (let number = 1; number <= 101; number++) {
    yield [romanNumeralFromNumber(number)!, number]
  }
  yield [romanNumeralFromNumber(200)!, 200]
  yield [romanNumeralFromNumber(443)!, 443]
  yield [romanNumeralFromNumber(512)!, 512]
  yield [romanNumeralFromNumber(768)!, 768]
  yield [romanNumeralFromNumber(1001)!, 1001]
  yield [romanNumeralFromNumber(2018)!, 2018]
  yield [romanNumeralFromNumber(2023)!, 2023]
  yield [romanNumeralFromNumber(2222)!, 2222]
}

describe("adjectifNumeralOrdinalCourt", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const ordinalNumber =
      number.toString() +
      (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(ordinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(adjectifNumeralOrdinalCourt(context)).toBe(number)
      expect(context.remaining()).toBe("")
    })
  }
})

describe("adverbeMultiplicatifLatin", () => {
  for (const [latinNumber, number] of generateLatinMultiplicativeAdverbs()) {
    test(`${latinNumber} == ${number}`, () => {
      const context = new TextParserContext(latinNumber)
      expect((adverbeMultiplicatifLatin(context) as TextAstNumber).value).toBe(
        number,
      )
      expect(context.remaining()).toBe("")
    })
  }
})

describe("nombreAsTextAstNumber", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const cardinalNumber = number.toString()
    test(cardinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(nombreAsTextAstNumber(context)).toStrictEqual({
        position: { start: 0, stop: cardinalNumber.length },
        text: task.name,
        value: number,
      })
      expect(context.remaining()).toBe("")
    })
  }
})

describe("nombreCardinal", () => {
  for (const number of [0, 1, 7, 15, 89, 1001, 2018]) {
    const cardinalNumber = number.toString()
    test(cardinalNumber, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(nombreCardinal(context)).toBe(number)
      expect(context.remaining()).toBe("")
    })
  }
})

describe("nombreRomainCardinal", () => {
  for (const [romanNumber, number] of generateRomanNumbers()) {
    test(`${romanNumber} == ${number}`, () => {
      const context = new TextParserContext(romanNumber)
      expect(nombreRomainCardinal(context) as TextAstNumber).toBe(number)
      expect(context.remaining()).toBe("")
    })
  }
})

describe("nombreRomainOrdinal", () => {
  for (const [romanNumber, number] of generateRomanNumbers()) {
    const ordinalRomanNumber =
      romanNumber + (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(`${ordinalRomanNumber} == ${number}`, () => {
      const context = new TextParserContext(ordinalRomanNumber)
      expect(nombreRomainOrdinal(context) as TextAstNumber).toBe(number)
      expect(context.remaining()).toBe("")
    })
  }
})

describe("nombreRomainOu0iAsTextAstNumber", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(nombreRomainOu0iAsTextAstNumber(context)).toStrictEqual({
      position: { start: 0, stop: task.name.length },
      text: task.name,
      value: 0,
    })
    expect(context.remaining()).toBe("")
  })
  for (const [romanNumber, number] of generateRomanNumbers()) {
    test(`${romanNumber} == ${number}`, () => {
      const context = new TextParserContext(romanNumber)
      expect(
        nombreRomainOu0iAsTextAstNumber(context) as TextAstNumber,
      ).toStrictEqual({
        position: { start: 0, stop: romanNumber.length },
        text: romanNumber,
        value: number,
      })
      expect(context.remaining()).toBe("")
    })
    const ordinalRomanNumber =
      romanNumber + (number === 1 ? "er" : Math.random() >= 0.5 ? "ème" : "e")
    test(`${ordinalRomanNumber} == ${number}`, () => {
      const context = new TextParserContext(ordinalRomanNumber)
      expect(
        nombreRomainOu0iAsTextAstNumber(context) as TextAstNumber,
      ).toStrictEqual({
        position: { start: 0, stop: ordinalRomanNumber.length },
        text: ordinalRomanNumber,
        value: number,
      })
      expect(context.remaining()).toBe("")
    })
  }
})
