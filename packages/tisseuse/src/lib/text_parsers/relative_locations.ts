import { alternatives, chain, optional, regExp } from "./parsers.js"
import { espace } from "./typography.js"

export const adjectifRelatifPluriel = alternatives(
  regExp("derni(er|ère)s", {
    flags: "i",
    value: (match, context) => ({
      index: -1,
      num: context.text(),
    }),
  }),
  regExp("mêmes", {
    flags: "i",
    value: { relative: 0 },
  }),
  regExp("premi(er|ère)s", {
    flags: "i",
    value: (match, context) => ({
      index: 1,
      num: context.text(),
    }),
  }),
  regExp("présente?s", {
    flags: "i",
    value: { relative: 0 },
  }),
  regExp("suivante?s", {
    flags: "i",
    value: { relative: "+∞" },
  }),
)

export const adjectifRelatifSingulier = alternatives(
  regExp("antépénultième", {
    flags: "i",
    value: (match, context) => ({
      index: -3,
      num: context.text(),
    }),
  }),
  regExp("avant-derni(er|ère)", {
    flags: "i",
    value: (match, context) => ({
      index: -2,
      num: context.text(),
    }),
  }),
  regExp("derni(er|ère)", {
    flags: "i",
    value: (match, context) => ({
      index: -1,
      num: context.text(),
    }),
  }),
  regExp("même", {
    flags: "i",
    value: { relative: 0 },
  }),
  regExp("pénultième", {
    flags: "i",
    value: (match, context) => ({
      index: -2,
      num: context.text(),
    }),
  }),
  regExp("précédente?", {
    flags: "i",
    value: { relative: -1 },
  }),
  regExp("premi(er|ère)", {
    flags: "i",
    value: (match, context) => ({
      index: 1,
      num: context.text(),
    }),
  }),
  regExp("présente?", {
    flags: "i",
    value: { relative: 0 },
  }),
  regExp("suivante?", {
    flags: "i",
    value: { relative: 1 },
  }),
)

export const adverbeRelatif = regExp("ci ?- ?(après|avant|dessous|dessus)", {
  flags: "i",
  value: (match) => `ci-${match[1]}`,
})

export const espaceAdverbeRelatif = chain([espace, adverbeRelatif], {
  value: (results) => results[1],
})

export const espacePrecite = regExp(" précitée?", {
  flags: "i",
})

export const relatifPluriel = alternatives(
  adverbeRelatif,
  adjectifRelatifPluriel,
)

export const relatifPlurielPrepose = chain(
  [
    optional(
      regExp("ces ", {
        flags: "i",
      }),
      { default: "" },
    ),
    adjectifRelatifPluriel,
  ],
  { value: (results) => results[1] },
)

export const relatifSingulier = alternatives(
  adverbeRelatif,
  adjectifRelatifSingulier,
)

export const relatifSingulierPrepose = chain(
  [
    optional(
      regExp("ce(tte|t)? ", {
        flags: "i",
      }),
      { default: "" },
    ),
    adjectifRelatifSingulier,
  ],
  { value: (results) => results[1] },
)
