import type { TextAst, TextPosition } from "./ast.js"

export type RegExpConverter = (
  match: RegExpExecArray,
  context: TextParserContext,
) => TextAst | undefined

export type TextAstConverter<T extends TextAst> = (
  ast: T,
  context: TextParserContext,
) => TextAst | undefined

export type TextParser = (context: TextParserContext) => TextAst | undefined

export class TextParserContext {
  input: string
  length = 0
  offset = 0
  usedInputs: TextTree | undefined = undefined
  variables: Record<string, TextAst> = {}

  constructor(public fullInput: string) {
    this.input = fullInput
  }

  position(): TextPosition {
    return {
      start: this.offset,
      stop: this.offset + this.length,
    }
  }

  text(): string {
    return this.fullInput.slice(this.offset, this.offset + this.length)
  }

  textSlice(position: TextPosition): string {
    return this.fullInput.slice(position.start, position.stop)
  }

  textFromResults(results: TextAst[] | undefined): string {
    return results === undefined ? "" : textFromTextTrees(results as TextTree[])
  }
}

type TextTree = string | null | Array<TextTree>

export const alternatives =
  (...alternatives: Array<TextParser | TextParser[]>): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    for (const parser of alternatives) {
      const ast = (
        Array.isArray(parser)
          ? chain(parser, { exportVariables: true })
          : parser
      )(context)
      if (ast !== undefined) {
        return ast
      }
    }
    return undefined
  }

export const chain =
  (
    sequence: Array<TextParser | TextParser[]>,
    {
      exportVariables,
      value,
    }: {
      exportVariables?: boolean
      value?: TextAst | TextAstConverter<TextAst[]>
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    // Push context.
    const savedInput = context.input
    const savedOffset = context.offset
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    const usedInputs = []
    const results: TextAst[] = []
    for (const parser of sequence) {
      const partialResult = (
        Array.isArray(parser) ? chain(parser, { exportVariables }) : parser
      )(context)
      if (partialResult === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        return undefined
      }
      if (context.usedInputs !== undefined) {
        usedInputs.push(context.usedInputs)
      }
      results.push(partialResult)
    }

    // Success

    context.length = context.offset - savedOffset
    context.offset -= context.length
    context.usedInputs = usedInputs.length === 0 ? undefined : usedInputs

    let ast: TextAst | undefined
    if (value === undefined) {
      ast = results
    } else if (typeof value === "function") {
      const convertedAst = value(results, context)
      if (convertedAst === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        return undefined
      }
      ast = convertedAst
    } else {
      ast = value
    }

    context.offset += context.length
    context.length = 0

    if (!exportVariables) {
      context.variables = savedVariables
    }

    return ast
  }

export const convert =
  (
    parser: TextParser | TextParser[],
    { value }: { value: TextAst | TextAstConverter<TextAst> },
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const savedInput = context.input
    const savedOffset = context.offset
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    const ast = (
      Array.isArray(parser) ? chain(parser, { exportVariables: true }) : parser
    )(context)
    if (ast === undefined) {
      return undefined
    }

    context.length = context.offset - savedOffset
    context.offset -= context.length

    if (typeof value === "function") {
      const convertedAst = value(ast, context)
      if (convertedAst === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        return undefined
      }
      return convertedAst
    }
    return value
  }

export const optional =
  (
    parser: TextParser | TextParser[],
    {
      default: defaultValue,
      value,
    }: {
      default: TextAst | TextParser
      value?: TextAst | TextAstConverter<TextAst>
    },
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let ast = (
      Array.isArray(parser) ? chain(parser, { exportVariables: true }) : parser
    )(context)
    if (ast === undefined) {
      ast =
        typeof defaultValue === "function"
          ? defaultValue(context)
          : defaultValue
    } else if (value !== undefined) {
      if (typeof value === "function") {
        const convertedAst = value(ast, context)
        if (convertedAst === undefined) {
          context.length = 0
          context.usedInputs = undefined
          return undefined
        }
        ast = convertedAst
      } else {
        ast = value
      }
    }
    return ast
  }

export const parseText = (
  input: string,
  parser: TextParser | TextParser[],
): TextAst | undefined =>
  (Array.isArray(parser) ? chain(parser) : parser)(new TextParserContext(input))

export const regExp =
  (
    regExp: string,
    {
      flags,
      value,
    }: {
      flags?: "d" | "di" | "div" | "i" | "iv" | "v" | null
      value?: TextAst | RegExpConverter
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const match = new RegExp(`^${regExp}`, flags ?? undefined).exec(
      context.input,
    )
    if (match === null) {
      return undefined
    }

    // Success

    context.length = match[0].length
    context.usedInputs = match[0]

    let ast: TextAst
    if (value === undefined) {
      ast = match[0]
    } else if (typeof value === "function") {
      const convertedAst = value(match, context)
      if (convertedAst === undefined) {
        context.length = 0
        context.usedInputs = undefined
        return undefined
      }
      ast = convertedAst
    } else {
      ast = value
    }

    context.input = context.input.slice(match[0].length)
    context.offset += context.length
    context.length = 0

    return ast
  }

export const repeat =
  (
    parser: TextParser | TextParser[],
    {
      max,
      min,
      separator,
      value,
    }: {
      max?: number
      min?: number
      separator?: TextParser
      value?: TextAst | TextAstConverter<TextAst[]>
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    // Push context.
    const savedInput = context.input
    const savedOffset = context.offset
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    const usedInputs = []
    const results: TextAst[] = []
    let i = 0
    for (; max === undefined ? true : i < max; i++) {
      const iterationResult = (
        i === 0 || separator === undefined
          ? Array.isArray(parser)
            ? chain(parser)
            : parser
          : chain([separator, parser])
      )(context)
      if (iterationResult === undefined) {
        break
      }
      if (context.usedInputs !== undefined) {
        usedInputs.push(context.usedInputs)
      }
      results.push(iterationResult)
    }
    if (min !== undefined && i < min) {
      // Abort ⇒ Pull context.
      context.input = savedInput
      context.length = 0
      context.offset = savedOffset
      context.usedInputs = undefined
      context.variables = savedVariables

      return undefined
    }

    // Success

    context.length = context.offset - savedOffset
    context.offset -= context.length
    context.usedInputs = usedInputs.length === 0 ? undefined : usedInputs

    let ast: TextAst | undefined
    if (value === undefined) {
      ast = results
    } else if (typeof value === "function") {
      const convertedAst = value(results, context)
      if (convertedAst === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        return undefined
      }
      ast = convertedAst
    } else {
      ast = value
    }

    context.offset += context.length
    context.length = 0

    return ast
  }

const textFromTextTrees = (textTrees: TextTree[]): string =>
  textTrees
    .filter((node) => node !== null)
    .map((node) => (typeof node === "string" ? node : textFromTextTrees(node)))
    .join("")

export const variable =
  (
    name: string,
    parser: TextParser | TextParser[],
    { value }: { value?: TextAst | TextAstConverter<TextAst> } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const savedInput = context.input
    const savedOffset = context.offset
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    const ast = (
      Array.isArray(parser) ? chain(parser, { exportVariables: true }) : parser
    )(context)
    if (ast === undefined) {
      delete context.variables[name]
      return undefined
    }

    if (value === undefined) {
      context.variables[name] = ast
      return ast
    }

    context.length = context.offset - savedOffset
    context.offset -= context.length

    if (typeof value === "function") {
      const convertedAst = value(ast, context)
      if (convertedAst === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        delete context.variables[name]
        return undefined
      }
      context.variables[name] = convertedAst
      return convertedAst
    }
    context.variables[name] = value
    return value
  }
