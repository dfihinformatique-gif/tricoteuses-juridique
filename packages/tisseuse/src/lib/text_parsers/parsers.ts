import { numberFromRomanNumeral } from "$lib/numbers.js"

import type {
  TextAst,
  TextAstTextInfos,
  TextInfosByWordsTree,
  TextPosition,
} from "./ast.js"

export type TextInfosConverter = (
  infos: TextAstTextInfos,
  context: TextParserContext,
) => TextAst | undefined

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
  length = 0
  usedInputs: TextTree | undefined = undefined
  variables: Record<string, TextAst> = {}

  constructor(
    public input: string,
    public offset = 0,
  ) {}

  position(): TextPosition {
    return {
      start: this.offset,
      stop: this.offset + this.length,
    }
  }

  remaining(): string {
    return this.input.slice(this.offset)
  }

  text(): string {
    return this.input.slice(this.offset, this.offset + this.length)
  }

  textSlice(position: TextPosition): string {
    return this.input.slice(position.start, position.stop)
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
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        return undefined
      }

      context.offset += context.length
      context.length = 0

      return convertedAst
    }

    context.offset += context.length
    context.length = 0

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
    regExpContent: string,
    {
      flags,
      value,
    }: {
      flags?: "d" | "di" | "div" | "i" | "iv" | "v" | null
      value?: TextAst | RegExpConverter
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const regExp = new RegExp(regExpContent, "gy" + (flags ?? ""))
    regExp.lastIndex = context.offset
    const match = regExp.exec(context.input)
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
        context.length = 0
        context.offset = savedOffset
        context.usedInputs = undefined
        context.variables = savedVariables

        delete context.variables[name]
        return undefined
      }

      context.offset += context.length
      context.length = 0
      context.variables[name] = convertedAst

      return convertedAst
    }

    context.offset += context.length
    context.length = 0
    context.variables[name] = value

    return value
  }

export const wordsTree =
  (
    tree: TextInfosByWordsTree,
    {
      value,
    }: {
      value?: TextAst | TextInfosConverter
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    let node = tree
    let offset = context.offset
    const regExp = /([\-\/\d\p{Alphabetic}°]+)($|[^\-\/\d\p{Alphabetic}°]+)/gvy
    regExp.lastIndex = context.offset
    const usedInputs = []
    while (true) {
      const match = regExp.exec(context.input)
      if (match === null) {
        break
      }
      let word = match[1]
      word = /^[IVX]+$/g.test(word)
        ? numberFromRomanNumeral(word).toString()
        : word.toLowerCase()
      if (word === "constitution" && match[1][0] !== "C") {
        // Accept only "Constituion" with an uppercase "C", to avoid
        // false positives.
        break
      }
      const child = node[word]
      if (child === undefined) {
        break
      }
      node = child
      offset = regExp.lastIndex
      usedInputs.push(match[0])
    }
    if (node.cid === undefined) {
      // Abort ⇒ Pull context.
      context.length = 0
      context.usedInputs = undefined

      return undefined
    }

    // Success

    context.length = offset - context.offset
    context.usedInputs = usedInputs.length === 0 ? undefined : usedInputs

    const infos = { cid: node.cid }
    let ast: TextAst
    if (value === undefined) {
      ast = infos
    } else if (typeof value === "function") {
      const convertedAst = value(infos, context)
      if (convertedAst === undefined) {
        // Abort ⇒ Pull context.
        context.length = 0
        context.usedInputs = undefined

        return undefined
      }
      ast = convertedAst
    } else {
      ast = value
    }

    context.offset = offset
    context.length = 0

    return ast
  }
