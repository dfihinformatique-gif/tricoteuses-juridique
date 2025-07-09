import {
  alternatives,
  chain,
  optional,
  regExp,
  synthesize,
  variable,
} from "./core.js"
import { tiret } from "./typography.js"

export function numberFromRomanNumeral(romanNumeral: string) {
  const conversionTable = [
    1000,
    "M",
    900,
    "CM",
    500,
    "D",
    400,
    "CD",
    100,
    "C",
    90,
    "XC",
    50,
    "L",
    40,
    "XL",
    10,
    "X",
    9,
    "IX",
    5,
    "V",
    4,
    "IV",
    1,
    "I",
  ]
  romanNumeral = romanNumeral.toUpperCase()
  let i = 0
  let result = 0
  for (let n = 0; n < conversionTable.length; n += 2) {
    while (
      romanNumeral.substring(
        i,
        i + (conversionTable[n + 1] as string).length,
      ) === conversionTable[n + 1]
    ) {
      result += conversionTable[n] as number
      i += (conversionTable[n + 1] as string).length
    }
  }
  return result
}

// Nombres arabes (cardinaux et/ou ordinaux)

export const eme = regExp("(èm)?e")

/**
 * Nombre cardinal ou ordinal
 */
export const nombre = alternatives(
  regExp("1er", { result: 1 }),
  chain(
    regExp(String.raw`\d+`),
    optional({ default: "" }, eme),
    synthesize(({ results }) => parseInt(results[0] as string)),
  ),
)

export const nombreCardinal = chain(
  regExp(String.raw`\d+`),
  synthesize(({ results }) => parseInt(results[0] as string)),
)

export const nombreOrdinal = alternatives(
  regExp("1er", { result: 1 }),
  chain(
    regExp(String.raw`\d+`),
    eme,
    synthesize(({ results }) => parseInt(results[0] as string)),
  ),
)

// Nombres romains (cardinaux et/ou ordinaux)

export const nombreRomainCardinal = chain(
  regExp(String.raw`[IVXLCDM]+`),
  synthesize(({ results }) => numberFromRomanNumeral(results[0] as string)),
)

export const nombreRomainOrdinal = alternatives(
  regExp("Ier", { result: 1 }),
  chain(
    regExp(String.raw`[IVXLCDM]+`),
    eme,
    synthesize(({ results }) => numberFromRomanNumeral(results[0] as string)),
  ),
)

export const nombreRomainOu0i = alternatives(
  regExp("0I", { result: 0 }),
  regExp("Ier", { result: 1 }),
  chain(
    regExp(String.raw`[IVXLCDM]+`),
    optional({ default: "" }, eme),
    synthesize(({ results }) => numberFromRomanNumeral(results[0] as string)),
  ),
)

// Adjectifs numéraux (ordinaux ou cardinaux)

export const adjectifNumeralCardinalDix = alternatives(
  regExp("dix", { flags: "i", result: 10 }),
  regExp("onze?", { flags: "i", result: 11 }),
  regExp("douze?", { flags: "i", result: 12 }),
  regExp("treize?", { flags: "i", result: 13 }),
  regExp("quatorze?", { flags: "i", result: 14 }),
  regExp("quinze?", { flags: "i", result: 15 }),
  regExp("seize?", { flags: "i", result: 16 }),
)

export const adjectifNumeralCardinalDizaine = alternatives(
  regExp("vingt", { flags: "i", result: 20 }),
  regExp("trente?", { flags: "i", result: 30 }),
  regExp("quarante?", { flags: "i", result: 40 }),
  regExp("cinquante?", { flags: "i", result: 50 }),
  regExp("soixante?", { flags: "i", result: 60 }),
  regExp("septante?", { flags: "i", result: 70 }),
  regExp("quatre-vingt", { flags: "i", result: 80 }),
  regExp("huitante?", { flags: "i", result: 80 }),
  regExp("octante?", { flags: "i", result: 80 }),
  regExp("nonante?", { flags: "i", result: 90 }),
)

export const adjectifNumeralCardinalUnite = alternatives(
  regExp("une?", { flags: "i", result: 1 }),
  regExp("deux", { flags: "i", result: 2 }),
  regExp("trois", { flags: "i", result: 3 }),
  regExp("quatre?", { flags: "i", result: 4 }),
  regExp("cinqu?", { flags: "i", result: 5 }),
  regExp("six", { flags: "i", result: 6 }),
  regExp("sept", { flags: "i", result: 7 }),
  regExp("huit", { flags: "i", result: 8 }),
  regExp("neu[fv]", { flags: "i", result: 9 }),
)

export const adjectifNumeralCardinal = chain(
  variable(
    "centaines",
    optional(
      { default: 0 },
      variable(
        "centaine",
        adjectifNumeralCardinalUnite,
        tiret,
        synthesize(({ results }) => results[0] as number),
      ),
      regExp("cent-", { flags: "i" }),
      synthesize(({ variables }) => 100 * (variables.centaine as number)),
    ),
  ),
  variable(
    "dizaines",
    optional({ default: 0 }, adjectifNumeralCardinalDizaine),
  ),
  optional({ default: "" }, regExp("-(et-)?", { flags: "i" })),
  variable("dix", optional({ default: 0 }, adjectifNumeralCardinalDix)),
  optional({ default: "" }, tiret),
  variable("unite", optional({ default: 0 }, adjectifNumeralCardinalUnite)),
  synthesize(
    ({ variables }) =>
      (variables.centaines as number) +
      (variables.dizaines as number) +
      (variables.dix as number) +
      (variables.unite as number),
  ),
)

export const adjectifNumeralOrdinal = alternatives(
  regExp("premi(er|ère)", { flags: "i", result: 1 }),
  regExp("seconde?", { flags: "i", result: 2 }),
  chain(
    adjectifNumeralCardinal,
    regExp("ième", { flags: "i" }),
    synthesize(({ results }) => results[0]),
  ),
)

export const adjectifOrdinal = alternatives(
  nombreOrdinal,
  adjectifNumeralOrdinal,
)

// Numérotation latine

export const adverbeMultiplicatif = chain(
  variable(
    "order",
    alternatives(
      // Mustt be first:
      regExp("quinquagies", { flags: "i", result: 50 }),
      regExp("sexagies", { flags: "i", result: 60 }),
      regExp("septuagies", { flags: "i", result: 70 }),
      regExp("octogies", { flags: "i", result: 80 }),

      chain(
        variable(
          "unites",
          optional(
            { default: 0 },
            alternatives(
              regExp("unde?", { flags: "i", result: -1 }),
              regExp("duode?", { flags: "i", result: -2 }),
              regExp("un", { flags: "i", result: 1 }),
              regExp("duo", { flags: "i", result: 2 }),
              regExp("ter", { flags: "i", result: 3 }),
              regExp("quater", { flags: "i", result: 4 }),
              regExp("quin", { flags: "i", result: 5 }),
              regExp("sept", { flags: "i", result: 7 }),
              regExp("sex?", { flags: "i", result: 6 }),
              regExp("octo", { flags: "i", result: 8 }),
              regExp("novo", { flags: "i", result: 9 }),
            ),
          ),
        ),
        variable(
          "dizaines",
          alternatives(
            regExp("decies", { flags: "i", result: 10 }),
            regExp("v[ei]cies", { flags: "i", result: 20 }),
            regExp("tr[ei]cies", { flags: "i", result: 30 }),
            regExp("quadragies", { flags: "i", result: 40 }),
            regExp("quinquagies", { flags: "i", result: 50 }),
            regExp("sexagies", { flags: "i", result: 60 }),
            regExp("septuagies", { flags: "i", result: 70 }),
            regExp("o?ctogies", { flags: "i", result: 80 }),
            regExp("nonagies", { flags: "i", result: 90 }),
          ),
        ),
        synthesize(
          ({ variables }) =>
            (variables.dizaines as number) + (variables.unites as number),
        ),
      ),

      // Must be last:
      regExp("semel", { flags: "i", result: 1 }),
      regExp("bis", { flags: "i", result: 2 }),
      regExp("ter", { flags: "i", result: 3 }),
      regExp("quater", { flags: "i", result: 4 }),
      regExp("quinquies", { flags: "i", result: 5 }),
      regExp("sexies", { flags: "i", result: 6 }),
      regExp("septies", { flags: "i", result: 7 }),
      regExp("octies", { flags: "i", result: 8 }),
      regExp("no[nv]ies", { flags: "i", result: 9 }),
      regExp("undecies", { flags: "i", result: 11 }),
      regExp("duodecies", { flags: "i", result: 12 }),
    ),
  ),
  synthesize((context) => ({
    id: context.text().toLowerCase(),
    order: context.variables.order as number,
  })),
)
