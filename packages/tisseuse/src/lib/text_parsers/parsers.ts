import { numberFromRomanNumeral } from "@tricoteuses/legifrance"

import type {
  TextAst,
  TextAstArticle,
  TextAstText,
  TextAstTextInfos,
  TextInfosByWordsTree,
  TextInfosByWordsTreeNode,
} from "./ast.js"
import type { FragmentPosition } from "./fragments.js"

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

export type TextParser<T extends TextAst = TextAst> = {
  (context: TextParserContext): T | undefined
  extract?: (
    context: TextParserContext,
    options?: { jumpExact?: boolean; overlapWindow?: number },
  ) => Generator<T, void, undefined>
}

export class TextParserContext {
  currentArticle: TextAstArticle | undefined = undefined
  currentText: TextAstText | undefined = undefined
  length = 0
  usedInputs: TextTree | undefined = undefined
  variables: Record<string, TextAst> = {}

  constructor(
    public input: string,
    public offset = 0,
  ) {}

  position(): FragmentPosition {
    return {
      start: this.offset,
      stop: this.offset + this.length,
    }
  }

  remaining(): string {
    return this.input.slice(this.offset)
  }

  text(position?: FragmentPosition): string {
    return position === undefined
      ? this.input.slice(this.offset, this.offset + this.length)
      : this.input.slice(position.start, position.stop)
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

/**
 * Executes a parser only if a fast-path regular expression matches ahead in the text.
 * It checks if the `fastRegExp` pattern exists within a short window ahead of `context.offset`.
 * If not, it skips evaluating the inner combinator tree, saving massive amounts of operations.
 */
export const fastPath = <T extends TextAst = TextAst>(
  fastRegExpContent: string,
  parser: TextParser<T> | TextParser<T>[],
  windowSize = 80,
  globalRegExpContent?: string,
): TextParser<T> => {
  // Compile strictly with 'y' (sticky) but test a window instead of anchoring at offset 0
  // We do not use 'y' because we want to match ANYWHERE within the slice window
  const fastRegExp = new RegExp(fastRegExpContent, "i")

  const parserFn = (context: TextParserContext): T | undefined => {
    // Extract a window of text immediately following the current offset
    const window = context.input.slice(
      context.offset,
      context.offset + windowSize,
    )

    // If the keyword doesn't appear in this upcoming window, it's impossible to parse here
    if (!fastRegExp.test(window)) {
      return undefined
    }

    // Fast-path matched nearby! Run the exact combinator at the *current* offset.
    return (
      Array.isArray(parser) ? chain(parser, { exportVariables: true }) : parser
    )(context) as T | undefined
  }

  parserFn.extract = function* (
    context: TextParserContext,
    options?: { jumpExact?: boolean; overlapWindow?: number },
  ): Generator<T, void, undefined> {
    const globalRegExp = new RegExp(
      globalRegExpContent ?? fastRegExpContent,
      "gimv",
    )
    let nextMatchIndex = -1

    while (context.offset < context.input.length) {
      if (context.offset > nextMatchIndex) {
        globalRegExp.lastIndex = context.offset
        const candidate = globalRegExp.exec(context.input)
        if (candidate === null) {
          return // No more matches possible
        }
        nextMatchIndex = candidate.index

        if (options?.jumpExact) {
          context.offset = nextMatchIndex
        } else if (options?.overlapWindow !== undefined) {
          // Delay offset assignment until the backward scanning loop below
        } else {
          // Fast-forward offset to exactly windowSize before the keyword,
          // because the parser might start that far back to match preceding context.
          context.offset = Math.max(context.offset, nextMatchIndex - windowSize)
        }
      }

      if (options?.overlapWindow !== undefined) {
        let bestAst: T | undefined = undefined
        let bestEndOffset = -1
        const startCheckIndex = Math.max(
          context.offset,
          nextMatchIndex - options.overlapWindow,
        )

        for (let i = startCheckIndex; i <= nextMatchIndex; i++) {
          context.offset = i
          const ast = parserFn(context)
          // To be a valid overlapping match, the parsing must consume past the anchor keyword's start index
          if (ast !== undefined && context.offset > nextMatchIndex) {
            bestAst = ast
            bestEndOffset = context.offset
            break
          }
        }

        if (bestAst !== undefined) {
          yield bestAst
          context.offset = bestEndOffset
          globalRegExp.lastIndex = context.offset
        } else {
          context.offset = nextMatchIndex + 1
          if (globalRegExp.lastIndex <= context.offset) {
            globalRegExp.lastIndex = context.offset
          } else {
            context.offset = globalRegExp.lastIndex
          }
        }
      } else {
        const ast = parserFn(context)
        if (ast !== undefined) {
          yield ast
          // context.offset is safely advanced by the inner parser logic
          if (options?.jumpExact) {
            globalRegExp.lastIndex = context.offset
          }
        } else {
          if (options?.jumpExact) {
            // For exact jumps, we don't inch forward checking every character
            // Wait for the next regexp execution at current lastIndex.
            if (globalRegExp.lastIndex <= context.offset) {
              context.offset++
            } else {
              context.offset = globalRegExp.lastIndex
            }
          } else {
            context.offset++
          }
        }
      }
    }
  }

  return parserFn
}

export const lookBehind =
  (
    parser: TextParser | TextParser[],
    {
      lookbackLength = 50,
      value,
    }: {
      lookbackLength?: number
      value?: TextAst | TextAstConverter<TextAst>
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    const minIndex = Math.max(0, context.offset - lookbackLength)

    // Start backwards from context.offset to minIndex
    for (let i = context.offset; i >= minIndex; i--) {
      const testContext = new TextParserContext(context.input, i)
      testContext.variables = { ...context.variables }
      testContext.currentArticle = context.currentArticle
      testContext.currentText = context.currentText

      const ast = (
        Array.isArray(parser)
          ? chain(parser, { exportVariables: true })
          : parser
      )(testContext)

      if (ast !== undefined && testContext.offset === context.offset) {
        let finalAst = ast
        if (value !== undefined) {
          if (typeof value === "function") {
            const convertedAst = value(ast, testContext)
            if (convertedAst === undefined) {
              continue
            }
            finalAst = convertedAst
          } else {
            finalAst = value
          }
        }

        context.variables = testContext.variables
        context.length = 0
        context.usedInputs = undefined

        return finalAst
      }
    }

    return undefined
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

export const regExp = (
  regExpContent: string,
  {
    flags,
    value,
  }: {
    flags?:
      | "d"
      | "di"
      | "dim"
      | "dimv"
      | "div"
      | "dm"
      | "dmv"
      | "dv"
      | "i"
      | "im"
      | "imv"
      | "iv"
      | "m"
      | "mv"
      | "v"
      | null
    value?: TextAst | RegExpConverter
  } = {},
): TextParser => {
  const compiledRegExp = new RegExp(regExpContent, "gy" + (flags ?? ""))

  return (context: TextParserContext): TextAst | undefined => {
    compiledRegExp.lastIndex = context.offset
    const match = compiledRegExp.exec(context.input)
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
    const regExp =
      /([\-\/\d\p{Alphabetic}'°]+)($|[^\-\/\d\p{Alphabetic}°]{1,10000})/gvy
    regExp.lastIndex = context.offset
    const usedInputs = []
    let lastSeparator: string | undefined = undefined
    while (true) {
      const match = regExp.exec(context.input)
      if (match === null) {
        break
      }
      let word = match[1]
      word = /^[IVX]+$/g.test(word)
        ? numberFromRomanNumeral(word).toString()
        : word.toLowerCase().replace(/^no$/, "n°")
      if (word === "constitution" && match[1][0] !== "C") {
        // Accept only "Constituion" with an uppercase "C", to avoid
        // false positives.
        break
      }
      const child = (node as TextInfosByWordsTreeNode)[word]
      if (child === undefined) {
        break
      }
      lastSeparator = match[2]
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

    // Remove the last trailing separator from used inputs.
    if (lastSeparator) {
      offset -= lastSeparator.length
      usedInputs[usedInputs.length - 1] = usedInputs[
        usedInputs.length - 1
      ].slice(0, -lastSeparator.length)
    }

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
