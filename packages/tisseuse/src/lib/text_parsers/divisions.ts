/**
 * Divisions des textes : Divisions des textes supra-articles
 */

import {
  type CompoundReferencesSeparator,
  type DivisionType,
  type TextAstDivision,
  type TextAstIncompleteHeader,
  type TextAstLocalization,
  type TextAstNumber,
  type TextAstParentChild,
  type TextAstReference,
} from "./ast.js"
import {
  createEnumerationOrBoundedInterval,
  iterAtomicFirstParentReferences,
} from "./helpers.js"
import {
  adjectifNumeralOrdinal,
  adverbeMultiplicatifLatin,
  nombreAsTextAstNumber,
  nombreRomainOu0iAsTextAstNumber,
} from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  repeat,
} from "./parsers.js"
import { ditPluriel, ditSingulier } from "./prepositions.js"
import {
  adjectifRelatifPluriel,
  adjectifRelatifSingulier,
  espaceAdverbeRelatif,
  relatifPluriel,
  relatifPlurielPrepose,
  relatifSingulier,
  relatifSingulierPrepose,
} from "./relative_locations.js"
import { separateurEnumeration, separateurPlage } from "./separators.js"
import { espace } from "./typography.js"

export const natureDivisionSingulier = alternatives(
  regExp("chapitre", { flags: "i", value: "chapitre" }),
  regExp("livre(?! des procédures fiscales)", { flags: "i", value: "livre" }),
  regExp("paragraphe", { flags: "i", value: "paragraphe" }),
  regExp("partie", { flags: "i", value: "partie" }),
  regExp("section", { flags: "i", value: "section" }),
  regExp("sous-paragraphe", { flags: "i", value: "sous-paragraphe" }),
  regExp("sous-section", { flags: "i", value: "sous-section" }),
  regExp("sous-sous-paragraphe", { flags: "i", value: "sous-sous-paragraphe" }),
  regExp("sous-titre", { flags: "i", value: "sous-titre" }),
  regExp("titre", { flags: "i", value: "titre" }),
)

export const natureDivisionPluriel = chain(
  [natureDivisionSingulier, regExp("s", { flags: "i" })],
  { value: (results) => results[0] },
)

export const nomDivision = alternatives(
  regExp("arrêtés", { flags: "i" }),
  regExp("législative", { flags: "i" }),
  chain(
    [
      regExp("réglementaire( ancienne)? ", { flags: "i" }),
      optional(
        [
          regExp(" [-:] ", { flags: "i" }),
          alternatives(regExp("arrêtés", { flags: "i" }), [
            regExp("décrets", { flags: "i" }),
            alternatives(
              regExp(" en Conseil d'[ÉE]tat", {
                flags: "i",
                value: " en Conseil d'État",
              }),
              regExp(" simples", { flags: "i" }),
            ),
          ]),
        ],
        { default: "" },
      ),
    ],
    { value: (results, context) => context.textFromResults(results) },
  ),
)

export const numeroDivision = chain(
  [
    alternatives(nombreRomainOu0iAsTextAstNumber, nombreAsTextAstNumber),
    optional([espace, adverbeMultiplicatifLatin], { default: null }),
  ],
  {
    value: (results) => {
      const nombre0 = results[0] as TextAstNumber
      const nombre1 = (results[1] as [string, TextAstNumber] | null)?.[1]
      return {
        index:
          nombre0.value + (nombre1 === undefined ? 0 : nombre1.value / 1000),
        num: `${nombre0.text}${nombre1 === undefined ? "" : ` ${nombre1.text}`}`,
      }
    },
  },
)

/**
 * Déclaration d'une division
 */
export const definitionDivision = alternatives(
  chain(
    [
      regExp("^", { flags: "m" }),
      natureDivisionSingulier,
      espace,
      numeroDivision,
      regExp("$", { flags: "m" }),
    ],
    {
      value: (results, context) => ({
        definition: true,
        ...(results[3] as TextAstLocalization),
        position: context.position(),
        type: results[1] as DivisionType,
      }),
    },
  ),
  chain(
    [
      regExp("^", { flags: "m" }),
      adjectifNumeralOrdinal,
      espace,
      natureDivisionSingulier,
      regExp("$", { flags: "m" }),
    ],
    {
      value: (results, context) => ({
        definition: true,
        index: results[1] as number,
        // num: (results[1] as number).toString(),
        position: context.position(),
        type: results[3] as DivisionType,
      }),
    },
  ),
)

export const designationDivision = alternatives(
  chain([numeroDivision, optional(espaceAdverbeRelatif, { default: "" })], {
    value: (results, context) => ({
      ...(results[0] as TextAstLocalization),
      ...(results[1] ? { localizationAdverb: results[1] } : {}),
      position: context.position(),
      type: "incomplete-header",
    }),
  }),
  chain([nomDivision, optional(espaceAdverbeRelatif, { default: "" })], {
    value: (results, context) => ({
      ...(results[1] ? { localizationAdverb: results[1] } : {}),
      num: results[0] as string,
      position: context.position(),
      type: "incomplete-header",
    }),
  }),
  convert(adjectifRelatifSingulier, {
    value: (result, context) => ({
      ...(result as TextAstLocalization),
      position: context.position(),
      type: "incomplete-header",
    }),
  }),
)

export const division2Internal = alternatives(
  designationDivision,
  convert(relatifSingulier, {
    value: (result, context) => ({
      ...(result as TextAstLocalization),
      position: context.position(),
      type: "incomplete-header",
    }),
  }),
)

export const division1Internal = alternatives(
  chain(
    [
      relatifSingulierPrepose,
      espace,
      natureDivisionSingulier,
      optional([espace, division2Internal], { default: [] }),
    ],
    {
      value: (results, context) => {
        const base = (results[3] as [string, TextAstIncompleteHeader])[1] ?? {
          position: context.position(),
          type: results[2] as DivisionType,
        }
        for (const reference of iterAtomicFirstParentReferences<TextAstIncompleteHeader>(
          base,
        )) {
          ;(reference as unknown as TextAstDivision).type =
            results[2] as DivisionType
          if (
            reference.index === undefined &&
            reference.relative === undefined
          ) {
            Object.assign(reference, results[0] as TextAstLocalization)
          }
        }
        return { ...base, position: context.position() }
      },
    },
  ),
  chain([adjectifNumeralOrdinal, espace, natureDivisionSingulier], {
    value: (results, context) => ({
      index: results[0],
      position: context.position(),
      type: results[2] as DivisionType,
    }),
  }),
  chain([natureDivisionSingulier, espace, division2Internal], {
    value: (results, context) => {
      const base = results[2] as TextAstReference
      for (const reference of iterAtomicFirstParentReferences<TextAstIncompleteHeader>(
        base,
      )) {
        ;(reference as unknown as TextAstDivision).type =
          results[0] as DivisionType
      }
      return {
        ...base,
        position: context.position(),
      }
    },
  }),
)

/**
 * Règle principale pour la reconnaissance d’une seule division
 */
export const division = chain(
  [optional(ditSingulier, { default: false }), division1Internal],
  {
    value: (results, context) => {
      const base = results[1] as TextAstDivision | TextAstParentChild
      if (results[0]) {
        for (const division of iterAtomicFirstParentReferences<TextAstDivision>(
          base,
        )) {
          division.ofTheSaid = true
        }
      }
      return {
        ...base,
        position: context.position(),
      }
    },
  },
)

/**
 * Liste de divisions, comprenant au minimum deux divisions
 */
export const listeDivisions = chain(
  [
    designationDivision,
    repeat([
      alternatives(separateurEnumeration, separateurPlage),
      alternatives(
        chain([adjectifRelatifPluriel], {
          value: (results, context) => ({
            ...(results[0] as TextAstLocalization),
            position: context.position(),
            type: "incomplete-header",
          }),
        }),
        designationDivision,
      ),
    ]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstIncompleteHeader,
        results[1] as Array<
          [CompoundReferencesSeparator, TextAstIncompleteHeader]
        >,
        context.position(),
      ),
  },
)

export const divisions2Internal = alternatives(
  listeDivisions,
  convert(relatifPluriel, {
    value: (result, context) => ({
      ...(result as TextAstLocalization),
      position: context.position(),
      type: "incomplete-header",
    }),
  }),
)

export const divisions1Internal = alternatives(
  chain(
    [
      relatifPlurielPrepose,
      espace,
      natureDivisionPluriel,
      optional([espace, divisions2Internal], { default: [] }),
    ],
    {
      value: (results, context) => {
        const base = (results[3] as [string, TextAstIncompleteHeader])[1] ?? {
          position: context.position(),
          type: results[2] as DivisionType,
        }
        for (const reference of iterAtomicFirstParentReferences<TextAstIncompleteHeader>(
          base,
        )) {
          ;(reference as unknown as TextAstDivision).type =
            results[2] as DivisionType
          if (
            reference.index === undefined &&
            reference.relative === undefined
          ) {
            Object.assign(reference, results[0] as TextAstLocalization)
          }
        }
        return { ...base, position: context.position() }
      },
    },
  ),
  chain([natureDivisionPluriel, espace, divisions2Internal], {
    value: (results, context) => {
      const base = results[2] as TextAstReference
      for (const reference of iterAtomicFirstParentReferences<TextAstIncompleteHeader>(
        base,
      )) {
        ;(reference as unknown as TextAstDivision).type =
          results[0] as DivisionType
      }
      return {
        ...base,
        position: context.position(),
      }
    },
  }),
)

/**
 * Règle principale pour la reconnaissance d’une liste de divisions
 */
export const divisions = chain(
  [optional(ditPluriel, { default: false }), divisions1Internal],
  {
    value: (results, context) => {
      const base = results[1] as TextAstDivision | TextAstParentChild
      if (results[0]) {
        for (const division of iterAtomicFirstParentReferences<TextAstDivision>(
          base,
        )) {
          division.ofTheSaid = true
        }
      }
      return {
        ...base,
        position: context.position(),
      }
    },
  },
)
