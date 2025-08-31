import { numberFromRomanNumeral } from "$lib/numbers.js"
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
export const nombre = alternatives(
  regExp("1er", { value: { index: 1 } }),
  chain([regExp(String.raw`\d+`), optional(eme, { default: "" })], {
    value: (results) => ({ index: parseInt(results[0] as string) }),
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
  regExp("Ier", { value: 1 }),
  chain([regExp(String.raw`[IVXLCDM]+`), eme], {
    value: (results) => numberFromRomanNumeral(results[0] as string),
  }),
)

export const nombreRomainOu0i = alternatives(
  regExp("0I", { value: { index: 0 } }),
  regExp("Ier", { value: { index: 1 } }),
  chain([regExp(String.raw`[IVXLCDM]+`), optional(eme, { default: "" })], {
    value: (results) => ({
      index: numberFromRomanNumeral(results[0] as string),
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

export const adjectifNumeralCardinal = chain(
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

export const adjectifNumeralOrdinalLong = alternatives(
  regExp("premi(er|ère)", { flags: "i", value: 1 }),
  regExp("seconde?", { flags: "i", value: 2 }),
  chain([adjectifNumeralCardinal, regExp("ième", { flags: "i" })], {
    value: (results) => results[0],
  }),
)

export const adjectifNumeralOrdinal = alternatives(
  adjectifNumeralOrdinalCourt,
  adjectifNumeralOrdinalLong,
)

// Numérotation latine

export const adverbeMultiplicatif = convert(
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

    // Must be last:
    regExp("semel", { flags: "i", value: 1 }),
    regExp("bis", { flags: "i", value: 2 }),
    regExp("ter", { flags: "i", value: 3 }),
    regExp("quater", { flags: "i", value: 4 }),
    regExp("quinquies", { flags: "i", value: 5 }),
    regExp("sexies", { flags: "i", value: 6 }),
    regExp("septies", { flags: "i", value: 7 }),
    regExp("octies", { flags: "i", value: 8 }),
    regExp("no[nv]ies", { flags: "i", value: 9 }),
    regExp("undecies", { flags: "i", value: 11 }),
    regExp("duodecies", { flags: "i", value: 12 }),
  ),
  {
    value: (result, context) => ({
      position: context.position(),
      text: context.text().toLowerCase(),
      value: result as number,
    }),
  },
)
