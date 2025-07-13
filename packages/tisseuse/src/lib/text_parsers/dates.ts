import { alternatives, chain, regExp, variable } from "./parsers.js"
import { espace } from "./typography.js"

export const annee = regExp(String.raw`[12]\d{3}`)

export const jour = alternatives(
  regExp("1er", { flags: "i", value: "01" }),
  regExp(String.raw`([12]\d|3[01])`, { value: (match) => match[0] }),
  regExp(String.raw`\d`, { value: (match) => "0" + match[0] }),
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

export const date = chain(
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
)

export const duDate = chain([regExp("du ", { flags: "i" }), date], {
  value: (results) => results[1],
})

export const espaceDuDate = chain([espace, duDate], {
  value: (results) => results[1],
})
