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
  results: TextAst[] = []
  synthesis?: TextAst = undefined
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

export const block =
  (
    { exportVariables }: { exportVariables: boolean },
    ...sequence: Array<TextParser>
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let result: TextAst | undefined

    // Push context.
    const savedInput = context.input
    const savedResults = context.results
    context.results = []
    // Note: No need to save `context.synthesis`, because it is undefined at this
    // instant.
    const savedUsedInputs = context.usedInputs
    context.usedInputs = []
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    for (const parser of sequence) {
      delete context.synthesis
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
    // Success ⇒ Pull context, but keep current input, and push result.
    savedResults.push(context.synthesis ?? context.results)
    context.results = savedResults
    delete context.synthesis
    savedUsedInputs.push(context.usedInputs)
    context.usedInputs = savedUsedInputs
    if (!exportVariables) {
      context.variables = savedVariables
    }

    return result
  }

export const chain = (...sequence: Array<TextParser>): TextParser =>
  block({ exportVariables: false }, ...sequence)

export const optional =
  (
    { default: defaultResult }: { default: TextAst },
    ...sequence: TextParser[]
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined =>
    block({ exportVariables: true }, ...sequence)(context) ?? defaultResult

export const parseText = (
  input: string,
  ...sequence: Array<TextParser>
): TextAst | undefined => chain(...sequence)(new TextParserContext(input))

export const regExp =
  (
    regExp: string,
    {
      flags,
      result,
    }: { flags?: "i" | "iv" | "v" | null; result?: TextAst } = {},
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
    return result ?? match[0]
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

export const synthesize =
  (func: TextParser): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const result = func(context)
    if (result !== undefined) {
      // When synthesize returns a synthesis, it is considered as the final
      // result of the chain (except when there are other parsers following
      // it in the chain). It also clears previous partial results.
      context.results = []
      context.synthesis = result
    }
    return result
  }

const textFromUsedInputs = (usedInputs: UsedInput[]): string =>
  usedInputs
    .map((usedInput) =>
      typeof usedInput === "string" ? usedInput : textFromUsedInputs(usedInput),
    )
    .join("")

export const variable =
  (name: string, ...sequence: Array<TextParser>): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const result = chain(...sequence)(context)
    if (result === undefined) {
      delete context.variables[name]
    } else {
      context.variables[name] = result
    }
    return result
  }
