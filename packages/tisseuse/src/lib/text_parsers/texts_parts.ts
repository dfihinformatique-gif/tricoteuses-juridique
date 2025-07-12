import { alternatives, chain, regExp } from "./core.js"

export const natureInfraArticleSingulier = alternatives(
  regExp("alinéa", { flags: "i", value: "alinéa" }),
  regExp("phrase", { flags: "i", value: "phrase" }),
)

export const natureInfraArticlePluriel = chain(
  [natureInfraArticleSingulier, regExp("s", { flags: "i" })],
  { value: ({ results }) => results[0] },
)

export const natureSupraArticleSingulier = alternatives(
  regExp("chapitre", { flags: "i", value: "chapitre" }),
  regExp("livre (?! des procédures fiscales)", { flags: "i", value: "livre" }),
  regExp("(sous-)?paragraphe", { flags: "i", value: "paragraphe" }),
  regExp("partie", { flags: "i", value: "partie" }),
  regExp("(sous-)?section", { flags: "i", value: "section" }),
  regExp("titre", { flags: "i", value: "titre" }),
)

export const natureSupraArticlePluriel = chain(
  [natureSupraArticleSingulier, regExp("s", { flags: "i" })],
  { value: ({ results }) => results[0] },
)

export const natureSingulier = alternatives(
  article,
  natureSupraArticleSingulier,
)

export const naturePluriel = chain(
  [natureSingulier, regExp("s", { flags: "i" })],
  { value: ({ results }) => results[0] },
)
