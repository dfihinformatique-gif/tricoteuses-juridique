import {
  type CompoundReferencesSeparator,
  type PortionType,
  type TextAstAtomicReference,
  type TextAstNombre,
  type TextAstParentChild,
  type TextAstPortion,
  type TextAstReference,
} from "./ast.js"
import {
  createEnumerationOrBoundedInterval,
  createParentChildTreeFromReferences,
} from "./helpers.js"
import {
  adjectifNumeralCardinal,
  adjectifNumeralOrdinal,
  adverbeMultiplicatif,
  nombreCardinal,
  nombreRomainCardinal,
} from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  repeat,
} from "./parsers.js"
import {
  ditPluriel,
  ditSingulier,
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./prepositions.js"
import {
  adjectifRelatifPluriel,
  adjectifRelatifSingulier,
  relatifPlurielPrepose,
} from "./relative_locations.js"
import { separateurEnumeration, separateurPlage } from "./separators.js"
import {
  espace,
  espaceOuRien,
  lettreAsciiMinuscule,
  nonLettre,
} from "./typography.js"

export const naturePortionSingulier = alternatives(
  regExp("alinéa", { flags: "i", value: "alinéa" }),
  regExp("phrase", { flags: "i", value: "phrase" }),
)

export const naturePortionPluriel = chain(
  [naturePortionSingulier, regExp("s", { flags: "i" })],
  { value: (results) => results[0] },
)

/**
 * Numéro de portion d'article, par exemple « III » ou « c » ou « 3° »
 *
 * Au sein d'un article, une portion peut contenir des sous-…-portions ou des alinéas
 * NB: s’il s’avère plus utile lors de la réutilisation de mieux séparer et structurer
 *  ces différents cas, il faudrait découper cette règle en trois.
 */
export const numeroPortion = chain(
  [
    alternatives(
      convert(nombreRomainCardinal, {
        value: (result, context) => ({
          id: context.text(),
          position: context.position(),
          value: result as number,
        }),
      }),
      convert(lettreAsciiMinuscule, {
        value: (result, context) => ({
          id: result as string,
          position: context.position(),
          value: (result as string).charCodeAt(0) - "a".charCodeAt(0) + 1,
        }),
      }),
      chain([nombreCardinal, regExp("[°o]?", { flags: "i" })], {
        value: (results, context) => ({
          id: context.text(),
          position: context.position(),
          value: results[0] as number,
        }),
      }),
    ),
    optional([espace, adverbeMultiplicatif], { default: null }),
    nonLettre,
  ],
  {
    value: (results, context) => {
      const nombre0 = results[0] as TextAstNombre
      const nombre1 = results[1] as TextAstNombre | null
      return {
        id: `${nombre0.id}${nombre1 ? ` ${nombre1.id}` : ""}`,
        index: nombre0.value + (nombre1 === null ? 0 : nombre1.value / 1000),
        position: context.position(),
        type: "portion",
      }
    },
  },
)

/**
 * Portion désignée soit par un adjectif relatif soit par un ordinal écrit en lettres,
 * par exemple « même alinéa » ou « troisième phrase »
 */
export const unePortion = chain(
  [
    alternatives(
      convert(adjectifNumeralOrdinal, {
        value: (result) => ({ index: result }) as TextAstPortion,
      }),
      convert(adjectifRelatifSingulier, {
        value: (result) => ({ localization: result }) as TextAstPortion,
      }),
    ),
    espace,
    naturePortionSingulier,
  ],
  {
    value: (results, context) => ({
      ...(results[0] as TextAstPortion),
      position: context.position(),
      type: results[2] as PortionType,
    }),
  },
)

export const numeroPortionOuUnePortion = alternatives(unePortion, numeroPortion)

export const plusieursPortions = chain(
  [
    adjectifNumeralCardinal,
    espace,
    convert(adjectifRelatifPluriel, {
      value: (result) => ({ localization: result }) as TextAstPortion,
    }),
    espace,
    naturePortionPluriel,
  ],
  {
    value: (results, context) => ({
      count: results[0] as number,
      first: {
        ...(results[2] as TextAstPortion),
        type: results[4] as PortionType,
      },
      position: context.position(),
      type: "counted-interval",
    }),
  },
)

/**
 * Note: `listeQuelquesPortions`, `listePortion`, `listePortions`
 * et `listeQuelquesPortions` sont quasiment identiques.
 * TODO: Les fusionner ?
 */
export const listePlusieursPortions = chain(
  [
    plusieursPortions,
    repeat([
      alternatives(separateurEnumeration, separateurPlage),
      alternatives(unePortion, plusieursPortions),
    ]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<
          [
            CompoundReferencesSeparator,
            TextAstAtomicReference | TextAstParentChild,
          ]
        >,
        context.position(),
      ),
  },
)

/**
 * TODO: Plus réfléchir aux différentes formulations possibles.
 * Attention à ne pas capturer « [elle] les a [reconnus] »,
 * qui pourrait facilement devenir un faux positif dans la loi 78-17.
 *
 * Note: `listeQuelquesPortions`, `listePortion`, `listePortions`
 * et `listeQuelquesPortions` sont quasiment identiques.
 * TODO: Les fusionner ?
 */
export const listePortion = chain(
  [
    alternatives(numeroPortionOuUnePortion, plusieursPortions),
    repeat([
      alternatives(separateurEnumeration, separateurPlage),
      alternatives(numeroPortionOuUnePortion, plusieursPortions),
    ]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<
          [
            CompoundReferencesSeparator,
            TextAstAtomicReference | TextAstParentChild,
          ]
        >,
        context.position(),
      ),
  },
)

/**
 * Note: `listeQuelquesPortions`, `listePortion`, `listePortions`
 * et `listeQuelquesPortions` sont quasiment identiques.
 * TODO: Les fusionner ?
 */
export const listeQuelquesPortions = chain(
  [
    alternatives(numeroPortionOuUnePortion, plusieursPortions),
    repeat(
      [
        alternatives(separateurEnumeration, separateurPlage),
        alternatives(numeroPortionOuUnePortion, plusieursPortions),
      ],
      { min: 1 },
    ),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<
          [
            CompoundReferencesSeparator,
            TextAstAtomicReference | TextAstParentChild,
          ]
        >,
        context.position(),
      ),
  },
)

/**
 * Note: `listeQuelquesPortions`, `listePortion`, `listePortions`
 * et `listeQuelquesPortions` sont quasiment identiques.
 * TODO: Les fusionner ?
 */
export const listePortions = alternatives(
  listePlusieursPortions,
  listeQuelquesPortions,
)

export const portionsEntreParentheses = chain(
  [
    espace,
    regExp(String.raw`\(`),
    espaceOuRien,
    listePortion,
    espaceOuRien,
    regExp(String.raw`\)`),
  ],
  { value: (results) => results[3] },
)

export const localisationPortion = alternatives(
  chain([liaisonSingulier, listePortion], { value: (results) => results[1] }),
  chain([liaisonPluriel, listePortions], { value: (results) => results[1] }),
  portionsEntreParentheses,
)

export const portions = chain(
  [
    optional(ditPluriel, { default: null }),
    optional(
      chain([relatifPlurielPrepose, espace], {
        value: (results) => results[0],
      }),
      { default: null },
    ),
    listePortions,
    repeat(localisationPortion),
  ],
  {
    value: (results, context) =>
      createParentChildTreeFromReferences(
        results[1] as TextAstReference,
        results[2] as TextAstAtomicReference[],
        context.position(),
      ),
  },
)

export const portion = chain(
  [
    optional(ditSingulier, { default: null }),
    listePortion,
    repeat(localisationPortion),
  ],
  {
    value: (results, context) =>
      createParentChildTreeFromReferences(
        results[1] as TextAstReference,
        results[2] as TextAstAtomicReference[],
        context.position(),
      ),
  },
)

export const auPortion = chain([introSingulier, portion], {
  value: (results, context) => ({
    ...(results[1] as TextAstReference),
    position: context.position(),
  }),
})

export const auxPortions = chain([introPluriel, portions], {
  value: (results, context) => ({
    ...(results[1] as TextAstReference),
    position: context.position(),
  }),
})

export const portionPreciseSPluriel = chain(
  [
    portions,
    repeat([separateurEnumeration, alternatives(auxPortions, auPortion)]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<
          [
            CompoundReferencesSeparator,
            TextAstAtomicReference | TextAstParentChild,
          ]
        >,
        context.position(),
      ),
  },
)

export const portionPreciseSingulier = chain(
  [
    portion,
    repeat([separateurEnumeration, alternatives(auxPortions, auPortion)]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<
          [
            CompoundReferencesSeparator,
            TextAstAtomicReference | TextAstParentChild,
          ]
        >,
        context.position(),
      ),
  },
)
