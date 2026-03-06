import { numberFromRomanNumeral } from "@tricoteuses/legifrance"

import type { TextAst } from "./ast.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  variable,
} from "./parsers.js"
import { tiret } from "./typography.js"

// Nombres arabes (cardinaux et/ou ordinaux)

export const eme = regExp("(èm)?e")

/**
 * Nombre cardinal ou ordinal
 */
export const nombreAsTextAstNumber = alternatives(
  regExp("1er", {
    value: (_match, context) => ({
      position: context.position(),
      text: context.text(),
      value: 1,
    }),
  }),
  regExp("unique", {
    value: (_match, context) => ({
      position: context.position(),
      text: context.text(),
      value: 1,
    }),
  }),
  chain([regExp(String.raw`\d+`), optional(eme, { default: "" })], {
    value: (results, context) => ({
      position: context.position(),
      text: context.text(),
      value: parseInt(results[0] as string),
    }),
  }),
)

export const nombreCardinal = regExp(String.raw`\d+`, {
  value: (match) => parseInt(match[0] as string),
})

export const adjectifNumeralOrdinalCourt = alternatives(
  regExp("1er", { value: 1 }),
  chain([regExp(String.raw`\d+`), eme], {
    value: (results) => parseInt(results[0] as string),
  }),
)

// Nombres romains (cardinaux et/ou ordinaux)

export const nombreRomainCardinal = regExp(String.raw`[IVXLCDM]+`, {
  value: (match) => numberFromRomanNumeral(match[0] as string),
})

export const nombreRomainOrdinal = alternatives(
  regExp("IER|Ier", { value: 1 }),
  chain([regExp(String.raw`[IVXLCDM]+`), eme], {
    value: (results) => numberFromRomanNumeral(results[0] as string),
  }),
)

export const nombreRomainOu0iAsTextAstNumber = alternatives(
  regExp("0I", {
    value: (_match, context) => ({
      position: context.position(),
      text: context.text(),
      value: 0,
    }),
  }),
  regExp("IER|Ier", {
    value: (_match, context) => ({
      position: context.position(),
      text: context.text(),
      value: 1,
    }),
  }),
  chain([regExp(String.raw`[IVXLCDM]+`), optional(eme, { default: "" })], {
    value: (results, context) => ({
      position: context.position(),
      text: context.text(),
      value: numberFromRomanNumeral(results[0] as string),
    }),
  }),
)

// Adjectifs numéraux (ordinaux ou cardinaux)

export const adjectifNumeralCardinalDix = alternatives(
  regExp("dix", { flags: "i", value: 10 }),
  regExp("onze?", { flags: "i", value: 11 }),
  regExp("douze?", { flags: "i", value: 12 }),
  regExp("treize?", { flags: "i", value: 13 }),
  regExp("quatorze?", { flags: "i", value: 14 }),
  regExp("quinze?", { flags: "i", value: 15 }),
  regExp("seize?", { flags: "i", value: 16 }),
)

export const adjectifNumeralCardinalDizaine = alternatives(
  regExp("vingt", { flags: "i", value: 20 }),
  regExp("trente?", { flags: "i", value: 30 }),
  regExp("quarante?", { flags: "i", value: 40 }),
  regExp("cinquante?", { flags: "i", value: 50 }),
  regExp("soixante?", { flags: "i", value: 60 }),
  regExp("septante?", { flags: "i", value: 70 }),
  regExp("quatre-vingt", { flags: "i", value: 80 }),
  regExp("huitante?", { flags: "i", value: 80 }),
  regExp("octante?", { flags: "i", value: 80 }),
  regExp("nonante?", { flags: "i", value: 90 }),
)

export const adjectifNumeralCardinalUnite = alternatives(
  regExp("une?", { flags: "i", value: 1 }),
  regExp("deux", { flags: "i", value: 2 }),
  regExp("trois", { flags: "i", value: 3 }),
  regExp("quatre?", { flags: "i", value: 4 }),
  regExp("cinqu?", { flags: "i", value: 5 }),
  regExp("six", { flags: "i", value: 6 }),
  regExp("sept", { flags: "i", value: 7 }),
  regExp("huit", { flags: "i", value: 8 }),
  regExp("neu[fv]", { flags: "i", value: 9 }),
)

export const adjectifNumeralCardinalLong = chain(
  [
    variable(
      "centaines",
      optional(
        [
          variable(
            "centaine",
            optional([adjectifNumeralCardinalUnite, tiret], {
              default: 0,
              value: (results) => (results as TextAst[])[0] as number,
            }),
          ),
          regExp("cent-", { flags: "i", value: 1 }),
        ],
        {
          default: 0,
          value: (_, { variables }) => 100 * (variables.centaine as number),
        },
      ),
    ),
    variable(
      "dizaines",
      optional(adjectifNumeralCardinalDizaine, { default: 0 }),
    ),
    optional(regExp("-(et-)?", { flags: "i" }), { default: "" }),
    variable("dix", optional(adjectifNumeralCardinalDix, { default: 0 })),
    optional(tiret, { default: "" }),
    variable("unite", optional(adjectifNumeralCardinalUnite, { default: 0 })),
  ],
  {
    value: (_, { variables }) =>
      (variables.centaines as number) +
      (variables.dizaines as number) +
      (variables.dix as number) +
      (variables.unite as number),
  },
)

export const adjectifNumeralCardinal = alternatives(
  regExp("1(er|ère)", { flags: "i", value: 1 }),
  regExp("premi(er|ère)", { flags: "i", value: 1 }),
  nombreCardinal,
  adjectifNumeralCardinalLong,
)

export const adjectifNumeralOrdinalLong = alternatives(
  regExp("premi(er|ère)", { flags: "i", value: 1 }),
  regExp("seconde?", { flags: "i", value: 2 }),
  chain([adjectifNumeralCardinalLong, regExp("ième", { flags: "i" })], {
    value: (results) => results[0],
  }),
)

export const adjectifNumeralOrdinal = alternatives(
  adjectifNumeralOrdinalCourt,
  adjectifNumeralOrdinalLong,
)

// Numérotation latine

export const multiplicativeLatinSuffixes: Array<{
  pattern: string
  value: number
}> = [
  { pattern: "bis", value: 2 },
  { pattern: "ter", value: 3 },
  { pattern: "quater", value: 4 },
  { pattern: "quinquies", value: 5 },
  { pattern: "sexies", value: 6 },
  { pattern: "septies", value: 7 },
  { pattern: "octies", value: 8 },
  { pattern: "no[nv]ies", value: 9 },
  { pattern: "undecies", value: 11 },
  { pattern: "duodecies", value: 12 },
  // Must be last:
  { pattern: "semel", value: 1 },
]

export const multiplicativeLatinSuffixPattern = multiplicativeLatinSuffixes
  .filter((entry) => entry.pattern !== "semel")
  .map((entry) => entry.pattern)
  .join("|")

export const adverbeMultiplicatifLatin = convert(
  alternatives(
    // Mustt be first:
    regExp("quinquagies", { flags: "i", value: 50 }),
    regExp("sexagies", { flags: "i", value: 60 }),
    regExp("septuagies", { flags: "i", value: 70 }),
    regExp("octogies", { flags: "i", value: 80 }),

    chain(
      [
        variable(
          "unites",
          optional(
            alternatives(
              regExp("unde?", { flags: "i", value: -1 }),
              regExp("duode?", { flags: "i", value: -2 }),
              regExp("un", { flags: "i", value: 1 }),
              regExp("duo", { flags: "i", value: 2 }),
              regExp("ter", { flags: "i", value: 3 }),
              regExp("quater", { flags: "i", value: 4 }),
              regExp("quin", { flags: "i", value: 5 }),
              regExp("sept", { flags: "i", value: 7 }),
              regExp("sex?", { flags: "i", value: 6 }),
              regExp("octo", { flags: "i", value: 8 }),
              regExp("novo", { flags: "i", value: 9 }),
            ),
            { default: 0 },
          ),
        ),
        variable(
          "dizaines",
          alternatives(
            regExp("decies", { flags: "i", value: 10 }),
            regExp("v[ei]cies", { flags: "i", value: 20 }),
            regExp("tr[ei]cies", { flags: "i", value: 30 }),
            regExp("quadragies", { flags: "i", value: 40 }),
            regExp("quinquagies", { flags: "i", value: 50 }),
            regExp("sexagies", { flags: "i", value: 60 }),
            regExp("septuagies", { flags: "i", value: 70 }),
            regExp("o?ctogies", { flags: "i", value: 80 }),
            regExp("nonagies", { flags: "i", value: 90 }),
          ),
        ),
      ],
      {
        value: (_, { variables }) =>
          (variables.dizaines as number) + (variables.unites as number),
      },
    ),

    ...multiplicativeLatinSuffixes.map((entry) =>
      regExp(entry.pattern, { flags: "i", value: entry.value }),
    ),
  ),
  {
    value: (result, context) => ({
      position: context.position(),
      text: context.text().toLowerCase(),
      value: result as number,
    }),
  },
)
