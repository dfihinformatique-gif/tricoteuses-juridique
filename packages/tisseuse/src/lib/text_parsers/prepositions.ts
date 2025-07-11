import { alternatives, chain, regExp } from "./core.js"

// Les introductions introduisent les expressions de liens.
// Elles correspondent aux séparateurs des pré-candidats

export const introPluriel = regExp("(aux|des|les)( |(?=dite?s ))", {
  flags: "i",
})

export const introSingulier = alternatives(
  regExp("(au|du|le)( |(?=dit ))", { flags: "i" }),
  regExp("([àa] )?la( |(?=dite ))", { flags: "i" }),
  regExp("([àa] )?l'", { flags: "i" }),
)

// Les liaisons lient une première expression de lien à une seconde
// précisant la localisation, à une échelle plus large

export const liaisonPluriel = chain(
  [
    alternatives(
      regExp(" de (?=ce(tte)?s )", { flags: "i" }),
      regExp(" des( |(?=dite?s ))", { flags: "i" }),
    ),
  ],
  { value: "des" },
)

export const liaisonSingulier = chain(
  [
    alternatives(
      regExp(" de (?=ce(tte|t)? )", { flags: "i" }),
      regExp(" de l'", { flags: "i" }),
      regExp(" de la( |(?=dite ))", { flags: "i" }),
      regExp(" du( |(?=dit ))", { flags: "i" }),
    ),
  ],
  { value: "de" },
)

// Deuxième partie de l’introduction ou de la liaison pour les expressions
// "dudit [article]", cette partie pouvant être signifiante pour localiser
//  le lien.

export const ditPluriel = regExp("dite?s ", { flags: "i", value: true })

export const ditSingulier = regExp("dite? ", { flags: "i", value: true })
