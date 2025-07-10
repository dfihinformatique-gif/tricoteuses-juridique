export type TextAst =
  | number
  | string
  | TextAstAdverbeMultiplicatif
  | Array<TextAst>

export interface TextAstAdverbeMultiplicatif {
  id: string
  order: number
}

export type TextParser = (context: TextParserContext) => TextAst | undefined

export class TextParserContext {
  /**
   * Used only by `regEpx` parser
   */
  match?: RegExpExecArray = undefined
  results: TextAst[] = []
  usedInputs: UsedInput[] = []
  variables: Record<string, TextAst> = {}

  constructor(public input: string) {}

  text(): string {
    return textFromUsedInputs(this.usedInputs)
  }
}

type UsedInput = string | Array<UsedInput>

export const alternatives =
  (...alternatives: Array<TextParser>): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    for (const parser of alternatives) {
      const result = parser(context)
      if (result !== undefined) {
        return result
      }
    }
    return undefined
  }

export const chain =
  (
    sequence: Array<TextParser>,
    {
      exportVariables,
      value,
    }: { exportVariables?: boolean; value?: TextAst | TextParser } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let result: TextAst | undefined

    // Push context.
    const savedInput = context.input
    const savedResults = context.results
    context.results = []
    const savedUsedInputs = context.usedInputs
    context.usedInputs = []
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    for (const parser of sequence) {
      result = parser(context)
      if (result === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.results = savedResults
        context.usedInputs = savedUsedInputs
        context.variables = savedVariables

        return undefined
      }
      context.results.push(result)
    }
    if (typeof value === "function") {
      result = value(context)
    } else if (value !== undefined) {
      result = value
    }
    if (result === undefined) {
      result = context.results
    }

    // Success ⇒ Pull context, but keep current input & usedInputs, and push result.
    savedResults.push(result)
    context.results = savedResults
    savedUsedInputs.push(context.usedInputs)
    context.usedInputs = savedUsedInputs
    if (!exportVariables) {
      context.variables = savedVariables
    }

    return result
  }

export const optional =
  (
    parser: TextParser | TextParser[],
    {
      default: defaultValue,
      value,
    }: {
      default: TextAst | TextParser
      value?: TextAst | TextParser
    },
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let result: TextAst | undefined
    if (Array.isArray(parser)) {
      result = chain(parser, { exportVariables: true, value })(context)
    } else {
      result = parser(context)
      if (typeof value === "function") {
        result = value(context)
      } else if (value !== undefined) {
        result = value
      }
    }
    return (
      result ??
      (typeof defaultValue === "function"
        ? defaultValue(context)
        : defaultValue)
    )
  }

export const parseText = (
  input: string,
  parser: TextParser | TextParser[],
  { value }: { value?: TextAst | TextParser } = {},
): TextAst | undefined => {
  const context = new TextParserContext(input)
  if (Array.isArray(parser)) {
    return chain(parser, { value })(context)
  }
  const result = parser(context)
  if (value === undefined) {
    return result
  }
  if (typeof value === "function") {
    return value(context)
  }
  return value
}

export const regExp =
  (
    regExp: string,
    {
      flags,
      value,
    }: { flags?: "i" | "iv" | "v" | null; value?: TextAst | TextParser } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const match = new RegExp(`^${regExp}`, flags ?? undefined).exec(
      context.input,
    )
    if (match === null) {
      return undefined
    }
    context.usedInputs.push(context.input.slice(0, match[0].length))
    context.input = context.input.slice(match[0].length)
    if (value === undefined) {
      return match[0]
    }
    if (typeof value === "function") {
      context.match = match
      const result = value(context)
      delete context.match
      return result
    }
    return value
  }

/**
 *
 * Syntaxic sugar that allows to create a text parsing function without typing it:
 * For example, `run((context) => "ok"` is the same thing as:
 * `(context: TextParserContext): TextAst | undefined => "ok"`
 */
export const run =
  (func: TextParser): TextParser =>
  (context: TextParserContext): TextAst | undefined =>
    func(context)

const textFromUsedInputs = (usedInputs: UsedInput[]): string =>
  usedInputs
    .map((usedInput) =>
      typeof usedInput === "string" ? usedInput : textFromUsedInputs(usedInput),
    )
    .join("")

export const variable =
  (
    name: string,
    parser: TextParser | TextParser[],
    { value }: { value?: TextAst | TextParser } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let result: TextAst | undefined
    if (Array.isArray(parser)) {
      result = chain(parser, { value })(context)
    } else {
      result = parser(context)
      if (typeof value === "function") {
        result = value(context)
      } else if (value !== undefined) {
        result = value
      }
    }
    if (result === undefined) {
      delete context.variables[name]
    } else {
      context.variables[name] = result
    }
    return result
  }
