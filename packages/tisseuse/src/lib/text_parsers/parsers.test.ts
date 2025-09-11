import { describe, expect, test } from "vitest"

import { chain, regExp, TextParserContext, variable } from "./parsers.js"

describe("variable", () => {
  test("defined variable", () => {
    const context = new TextParserContext("OK")
    expect(
      chain([variable("ok", regExp("OK"))], {
        value: (_, { variables }) => {
          const { ok } = variables
          return ok === "OK" ? "ok" : undefined
        },
      })(context),
    ).toBe("ok")
    expect(context.remaining()).toBe("")
  })

  test("variable inside & outside chain", () => {
    const context = new TextParserContext("OK")
    expect(
      chain(
        [
          chain([variable("ok", regExp("OK"))], {
            value: (_, { variables }) => {
              const { ok } = variables
              return ok === "OK" ? "ok" : undefined
            },
          }),
        ],
        {
          value: (_, { variables }) => {
            const { ok } = variables
            return ok === undefined
              ? "variable ok is no more defined"
              : undefined
          },
        },
      )(context),
    ).toBe("variable ok is no more defined")
    expect(context.remaining()).toBe("")
  })
})
