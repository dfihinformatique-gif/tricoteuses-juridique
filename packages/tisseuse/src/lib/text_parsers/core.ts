export type EuropeanLawType = (typeof europeanLawTypes)[number]

export type FrenchLawType = (typeof frenchLawTypes)[number]

export type InternationalLawType = (typeof internationalLawTypes)[number]

export type LawType = (typeof lawTypes)[number]

export type TextAst =
  | boolean
  | number
  | string
  | TestAstAction
  | TextAstAdverbeMultiplicatif
  | TextAstCitation
  | TextAstLaw
  | (TextAstLaw & TextAstPositionAndText)
  | TextAstLawIdentification
  | TextAstLocalisation
  | TextAstPositionAndText
  | Array<TextAst>

export interface TestAstAction {
  action:
    | "CREATION"
    | "CREATION_OU_MODIFICATION"
    | "MODIFICATION"
    | "SUPPRESSION"
  actionInContent?: boolean
}

export interface TextAstAdverbeMultiplicatif {
  id: string
  order: number
}

export type TextAstCitation = {
  content: TextAstPositionAndText[]
  type: "citation"
} & TextAstPositionAndText

export interface TextAstLaw {
  id?: string
  lawDate?: string
  lawType: LawType
  legislation?: "international" | "UE"
  localization?: TextAstLocalisation
  ofTheSaid?: boolean
  type: "law"
}

export interface TextAstLawIdentification {
  id?: string
  lawDate?: string
}

export type TextAstLocalisation =
  | { absolute: number }
  | { relative: number | "+∞" }

export interface TextAstPositionAndText {
  position: TextPosition
  text: string
}

export type TextParser = (context: TextParserContext) => TextAst | undefined

export class TextParserContext {
  length = 0
  /**
   * Used only by `regEpx` parser
   */
  match?: RegExpExecArray = undefined
  offset = 0
  results: TextAst[] = []
  usedInputs: UsedInput[] = []
  variables: Record<string, TextAst> = {}

  constructor(public input: string) {}

  position(): TextPosition {
    return {
      start: this.offset,
      stop: this.offset + this.length,
    }
  }

  text(): string {
    return textFromUsedInputs(this.usedInputs)
  }
}

export interface TextPosition {
  start: number
  stop: number
}

type UsedInput = string | Array<UsedInput>

export const europeanLawTypes = ["directive", "règlement"] as const

export const frenchLawTypes = [
  "arrêté",
  "circulaire",
  "code",
  "constitution",
  "décret",
  "décret-loi",
  "loi",
  "loi constitutionnelle",
  "loi organique",
  "ordonnance",
] as const

export const internationalLawTypes = ["convention"] as const

export const lawTypes = [
  ...europeanLawTypes,
  ...frenchLawTypes,
  ...internationalLawTypes,
] as const

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
    // Push context.
    const savedInput = context.input
    const savedLength = context.length
    const savedOffset = context.offset
    const savedResults = context.results
    context.results = []
    const savedUsedInputs = context.usedInputs
    context.usedInputs = []
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    for (const parser of sequence) {
      const partialResult = parser(context)
      if (partialResult === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = savedLength
        context.offset = savedOffset
        context.results = savedResults
        context.usedInputs = savedUsedInputs
        context.variables = savedVariables

        return undefined
      }
      context.results.push(partialResult)
    }

    // Success

    context.length = context.offset - savedOffset
    context.offset -= context.length

    let result: TextAst | undefined
    if (value === undefined) {
      result = context.results
    } else if (typeof value === "function") {
      const valueResult = value(context)
      if (valueResult === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = savedLength
        context.offset = savedOffset
        context.results = savedResults
        context.usedInputs = savedUsedInputs
        context.variables = savedVariables

        return undefined
      }
      result = valueResult
    } else {
      result = value
    }

    context.offset += context.length
    context.length = 0

    // Pull context, but keep current input & usedInputs, and push result.
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
      if (value !== undefined) {
        throw new Error(
          "Parser `optional` can't be called with a `value` option when `parser` is not an array",
        )
      }
      result = parser(context)
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
    }: {
      flags?: "d" | "di" | "div" | "i" | "iv" | "v" | null
      value?: TextAst | TextParser
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
    const savedUsedInputs = context.usedInputs
    context.usedInputs = [match[0]]

    let result: TextAst
    if (value === undefined) {
      result = match[0]
    } else if (typeof value === "function") {
      context.match = match
      const valueResult = value(context)
      delete context.match
      if (valueResult === undefined) {
        context.length = 0
        return undefined
      }
      result = valueResult
    } else {
      result = value
    }

    context.offset += context.length
    context.length = 0

    savedUsedInputs.push(context.usedInputs[0])
    context.usedInputs = savedUsedInputs
    context.input = context.input.slice(match[0].length)

    return result
  }

export const repeat =
  (
    parser: TextParser,
    {
      max,
      min,
      separator,
      value,
    }: {
      max?: number
      min?: number
      separator?: TextParser
      value?: TextAst | TextParser
    } = {},
  ): TextParser =>
  (context: TextParserContext): TextAst | undefined => {
    // Push context.
    const savedInput = context.input
    const savedLength = context.length
    const savedOffset = context.offset
    const savedResults = context.results
    context.results = []
    const savedUsedInputs = context.usedInputs
    context.usedInputs = []
    const savedVariables = context.variables
    context.variables = { ...savedVariables }

    let i = 0
    for (; max === undefined ? true : i < max; i++) {
      const iterationResult = (
        i === 0 || separator === undefined ? parser : chain([separator, parser])
      )(context)
      if (iterationResult === undefined) {
        break
      }
      context.results.push(iterationResult)
    }
    if (min !== undefined && i < min) {
      // Abort ⇒ Pull context.
      context.input = savedInput
      context.length = savedLength
      context.offset = savedOffset
      context.results = savedResults
      context.usedInputs = savedUsedInputs
      context.variables = savedVariables

      return undefined
    }

    // Success

    context.length = context.offset - savedOffset
    context.offset -= context.length

    let result: TextAst | undefined
    if (value === undefined) {
      result = context.results
    } else if (typeof value === "function") {
      const valueResult = value(context)
      if (valueResult === undefined) {
        // Abort ⇒ Pull context.
        context.input = savedInput
        context.length = savedLength
        context.offset = savedOffset
        context.results = savedResults
        context.usedInputs = savedUsedInputs
        context.variables = savedVariables

        return undefined
      }
      result = valueResult
    } else {
      result = value
    }

    context.offset += context.length
    context.length = 0

    // Pull context, but keep current input & usedInputs, and push result.
    context.results = savedResults
    savedUsedInputs.push(context.usedInputs)
    context.usedInputs = savedUsedInputs

    return result
  }

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
      if (value !== undefined) {
        throw new Error(
          "Parser `variable` can't be called with a `value` option when `parser` is not an array",
        )
      }
      result = parser(context)
    }
    if (result === undefined) {
      delete context.variables[name]
    } else {
      context.variables[name] = result
    }
    return result
  }
