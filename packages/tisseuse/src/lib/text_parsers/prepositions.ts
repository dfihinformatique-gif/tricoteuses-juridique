import { alternatives, chain, convert, regExp } from "./parsers.js"

// Les introductions introduisent les expressions de liens.
// Elles correspondent aux séparateurs des pré-candidats

export const introPluriel = regExp(
  String.raw`(?<=^|\P{Alphabetic})(aux|des|les)( |(?=dite?s ))`,
  {
    flags: "iv",
  },
)

export const introSingulier = alternatives(
  regExp(String.raw`(?<=^|\P{Alphabetic})(au|du|le)( |(?=dit ))`, {
    flags: "iv",
  }),
  regExp(String.raw`(?<=^|\P{Alphabetic})([àa] )?la( |(?=dite ))`, {
    flags: "iv",
  }),
  regExp(String.raw`(?<=^|\P{Alphabetic})([àa] )?l'`, { flags: "iv" }),
)

// Les liaisons lient une première expression de lien à une seconde
// précisant la localisation, à une échelle plus large

export const liaisonPluriel = chain(
  [
    alternatives(
      regExp(String.raw`[ \n]de (?=ce(tte)?s )`, { flags: "i" }),
      regExp(String.raw`[ \n]des( |(?=dite?s ))`, { flags: "i" }),
    ),
  ],
  { value: "des" },
)

export const liaisonSingulier = convert(
  alternatives(
    regExp(String.raw`[ \n]de (?=ce(tte|t)? )`, { flags: "i" }),
    regExp(String.raw`[ \n]de l'`, { flags: "i" }),
    regExp(String.raw`[ \n]de la( |(?=dite ))`, { flags: "i" }),
    regExp(String.raw`[ \n]du( |(?=dit ))`, { flags: "i" }),
  ),
  { value: "de" },
)

// Deuxième partie de l’introduction ou de la liaison pour les expressions
// "dudit [article]", cette partie pouvant être signifiante pour localiser
//  le lien.

export const ditPluriel = regExp("dite?s ", { flags: "i", value: true })

export const ditSingulier = regExp("dite? ", { flags: "i", value: true })

// Adjectifs temporels pour distinguer les nouveaux articles des anciens

export const adjectifTemporelSingulier = alternatives(
  regExp("(nouvel|nouveau|nouvelle) ", { flags: "i", value: "new" }),
  regExp("(ancien|ancienne) ", { flags: "i", value: "old" }),
)
