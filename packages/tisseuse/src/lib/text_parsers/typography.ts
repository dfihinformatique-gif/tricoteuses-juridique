import { regExp } from "./core.js"

export const apostrophe = regExp("' ?", { result: "'" })

export const espace = regExp(" ")

export const espaceOuRien = regExp(" ?", { result: "" })

export const lettreAsciiMinuscule = regExp("[a-z]")

export const nonLettre = regExp(String.raw`\P{Alphabetic}`, { flags: "iv" })

export const numero = regExp("n[°o] ?", { flags: "i", result: "n° " })

export const tiret = regExp("-")

export const virgule = regExp(", ?", { result: ", " })

export const virguleOuEspace = regExp("(, ?| )", { result: ", " })
