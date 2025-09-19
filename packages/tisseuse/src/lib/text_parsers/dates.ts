import { romanNumeralFromNumber } from "$lib/numbers.js"

import type { TextAstTextIdentification } from "./ast.js"
import { nombreRomainCardinal } from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  variable,
} from "./parsers.js"
import { espace } from "./typography.js"

export const annee = regExp(String.raw`[12]\d{3}`)

export const anneeCalendrierRepublicain = convert(
  alternatives(nombreRomainCardinal, regExp(String.raw`1[0-4]|\d`)),
  {
    value: (annee) => romanNumeralFromNumber(parseInt(annee as string)),
  },
)

export const jour = alternatives(
  regExp("1er", { flags: "i", value: "01" }),
  regExp(String.raw`[12]\d|3[01]`, { value: (match) => match[0] }),
  regExp(String.raw`\d`, { value: (match) => "0" + match[0] }),
)

export const jourCalendrierRepublicain = alternatives(
  regExp("1er", { flags: "i", value: "1" }),
  regExp(String.raw`[12]\d|30`, { value: (match) => match[0] }),
  regExp(String.raw`\d`, { value: (match) => match[0] }),
)

export const mois = alternatives(
  regExp("janvier", { flags: "i", value: "01" }),
  regExp("février", { flags: "i", value: "02" }),
  regExp("mars", { flags: "i", value: "03" }),
  regExp("avril", { flags: "i", value: "04" }),
  regExp("mai", { flags: "i", value: "05" }),
  regExp("juin", { flags: "i", value: "06" }),
  regExp("juillet", { flags: "i", value: "07" }),
  regExp("août", { flags: "i", value: "08" }),
  regExp("septembre", { flags: "i", value: "09" }),
  regExp("octobre", { flags: "i", value: "10" }),
  regExp("novembre", { flags: "i", value: "11" }),
  regExp("décembre", { flags: "i", value: "12" }),
)

export const moisCalendrierRepublicain = alternatives(
  regExp("vendémiaire", { flags: "i", value: "vendémiaire" }),
  regExp("brumaire", { flags: "i", value: "brumaire" }),
  regExp("frimaire", { flags: "i", value: "frimaire" }),
  regExp("nivôse", { flags: "i", value: "nivôse" }),
  regExp("pluviôse", { flags: "i", value: "pluviôse" }),
  regExp("ventôse", { flags: "i", value: "ventôse" }),
  regExp("germinal", { flags: "i", value: "germinal" }),
  regExp("floréal", { flags: "i", value: "floréal" }),
  regExp("prairial", { flags: "i", value: "prairial" }),
  regExp("messidor", { flags: "i", value: "messidor" }),
  regExp("thermidor", { flags: "i", value: "thermidor" }),
  regExp("fructidor", { flags: "i", value: "fructidor" }),
)

export const date = alternatives(
  chain(
    [
      variable("jour", jour),
      espace,
      variable("mois", mois),
      espace,
      variable("annee", annee),
    ],
    {
      value: (_, { variables }) =>
        `${variables.annee}-${variables.mois}-${variables.jour}`,
    },
  ),
  chain(
    [
      variable("jour", jour),
      regExp("-"),
      variable(
        "mois",
        alternatives(
          regExp(String.raw`1[0-2]`, { value: (match) => match[0] }),
          regExp(String.raw`0?(\d)`, { value: (match) => "0" + match[1] }),
        ),
      ),
      regExp("-"),
      variable("annee", annee),
    ],
    {
      value: (_, { variables }) =>
        `${variables.annee}-${variables.mois}-${variables.jour}`,
    },
  ),
)

export const dateCalendrierRepublicain = chain(
  [
    variable("jour", jourCalendrierRepublicain),
    espace,
    variable("mois", moisCalendrierRepublicain),
    regExp(" an ", { flags: "i" }),
    variable("annee", anneeCalendrierRepublicain),
  ],
  {
    value: (_, { variables }) =>
      `${variables.jour} ${variables.mois} an ${variables.annee}`,
  },
)

export const duDate = chain(
  [
    optional(regExp("du ", { flags: "i" }), { default: null }),
    alternatives(
      chain(
        [
          dateCalendrierRepublicain,
          optional(
            chain([regExp(String.raw` \(`), date, regExp(String.raw`\)`)], {
              value: (results) => results[1],
            }),
            { default: null },
          ),
        ],
        {
          value: (results) => {
            const identification = {
              dateCalendrierRepublicain: results[0] as string,
            } as TextAstTextIdentification
            const date = results[1] as string | null
            if (date !== null) {
              identification.date = date
            }
            return identification
          },
        },
      ),
      convert(date, {
        value: (result) =>
          ({ date: result as string }) as TextAstTextIdentification,
      }),
    ),
  ],
  {
    value: (results) => results[1],
  },
)

export const espaceDuDate = chain([espace, duDate], {
  value: (results) => results[1],
})
