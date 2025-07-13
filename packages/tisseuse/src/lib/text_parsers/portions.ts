import { alternatives, chain, regExp } from "./core.js"

export const naturePortionSingulier = alternatives(
  regExp("alinéa", { flags: "i", value: "alinéa" }),
  regExp("phrase", { flags: "i", value: "phrase" }),
)

export const naturePortionPluriel = chain(
  [naturePortionSingulier, regExp("s", { flags: "i" })],
  { value: ({ results }) => results[0] },
)

export const natureSingulier = alternatives(article, natureDivisionSingulier)

export const naturePluriel = chain(
  [natureSingulier, regExp("s", { flags: "i" })],
  { value: ({ results }) => results[0] },
)
