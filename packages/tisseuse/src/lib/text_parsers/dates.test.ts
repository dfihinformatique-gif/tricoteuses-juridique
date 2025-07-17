import { describe, expect, test } from "vitest"

import { date, duDate } from "./dates.js"
import { TextParserContext } from "./parsers.js"

const months: Record<string, string> = {
  "1": "janvier",
  "2": "février",
  "3": "mars",
  "4": "avril",
  "5": "mai",
  "6": "juin",
  "7": "juillet",
  "8": "août",
  "9": "septembre",
  "10": "octobre",
  "11": "novembre",
  "12": "décembre",
}

function* generateDates(): Generator<[string, string]> {
  const year = Math.floor(Math.random() * (2999 - 1000) + 1000).toString()
  for (let m = 1; m <= 12; m++) {
    const month = m.toString()
    yield [
      "1er " + months[month] + " " + year,
      year + "-" + (month.length === 1 ? "0" : "") + month + "-01",
    ]
    yield [
      "16 " + months[month] + " " + year,
      year + "-" + (month.length === 1 ? "0" : "") + month + "-16",
    ]
  }
  for (let d = 0; d < 31; d++) {
    const day = (d + 1).toString()
    yield [
      day + " mars " + year,
      year + "-03-" + (day.length === 1 ? "0" : "") + day,
    ]
  }
}

describe("date", () => {
  for (const [frenchDate, isoDate] of generateDates()) {
    test(frenchDate, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(date(context)).toBe(isoDate)
      expect(context.remaining()).toBe("")
    })
  }
})

describe("duDate", () => {
  for (const [frenchDate, isoDate] of generateDates()) {
    const duFrenchDate = "du " + frenchDate
    test(duFrenchDate, ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(duDate(context)).toBe(isoDate)
      expect(context.remaining()).toBe("")
    })
  }
})
