import { regExp } from "./parsers.js"

export const apostrophe = regExp("' ?", { value: "'" })

export const espace = regExp(" ")

export const espaceOuRien = regExp(" ?", { value: "" })

export const lettreAsciiMinuscule = regExp("[a-z]")

export const nonLettre = regExp(String.raw`(?=$|\P{Alphabetic})`, {
  flags: "iv",
})

export const numero = regExp("n[°o] ?", { flags: "i", value: "n° " })

export const tiret = regExp("-")

export const virgule = regExp(", ?", { value: ", " })

export const virguleOuEspace = regExp("(, ?| )", { value: ", " })
