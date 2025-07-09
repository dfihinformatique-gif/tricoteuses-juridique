import { describe, expect, test } from "vitest"

import {
  chain,
  regExp,
  run,
  TextParserContext,
  variable,
  type TextAst,
} from "./core.js"

describe("run", () => {
  test("constant result", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(run(() => "ok")(context)).toBe("ok")
    expect(context.input).toBe(task.name)
  })

  test("input", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(
      run(({ input }) => {
        return input === task.name ? "ok" : undefined
      })(context),
    ).toBe("ok")
  })

  // Same parser as above, without using `run` syntaxic sugar
  test("input without run", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(
      (({ input }: TextParserContext): TextAst | undefined => {
        return input === task.name ? "ok" : undefined
      })(context),
    ).toBe("ok")
    expect(context.input).toBe(task.name)
  })

  test("defined variable", () => {
    const context = new TextParserContext("OK")
    expect(
      chain(
        variable("ok", regExp("OK")),
        run(({ variables }) => {
          const { ok } = variables
          return ok === "OK" ? "ok" : undefined
        }),
      )(context),
    ).toBe("ok")
    expect(context.input).toBe("")
  })

  test("undefined variable", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(
      run(({ variables }) => {
        const { notDefined } = variables
        return notDefined === undefined ? "ok" : undefined
      })(context),
    ).toBe("ok")
    expect(context.input).toBe(task.name)
  })

  test("variable outside chain", () => {
    const context = new TextParserContext("OK")
    expect(
      chain(
        chain(
          variable("ok", regExp("OK")),
          run(({ variables }) => {
            const { ok } = variables
            return ok === "OK" ? "ok" : undefined
          }),
        ),
        run(({ variables }) => {
          const { ok } = variables
          return ok === undefined ? "variable ok is no more defined" : undefined
        }),
      )(context),
    ).toBe("variable ok is no more defined")
    expect(context.input).toBe("")
  })
})
