import {
  type CompoundReferencesSeparator,
  type PortionType,
  type TextAstAtomicReference,
  type TextAstLocalization,
  type TextAstNumber,
  type TextAstPortion,
  type TextAstReference,
} from "./ast.js"
import { mois } from "./dates.js"
import {
  createEnumerationOrBoundedInterval,
  createParentChildTreeFromReferences,
} from "./helpers.js"
import {
  adjectifNumeralCardinal,
  adjectifNumeralCardinalLong,
  adjectifNumeralOrdinalLong,
  adverbeMultiplicatifLatin,
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
  type TextParser,
  type TextParserContext,
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
  virgule,
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
 * Parser qui vérifie qu'on n'est pas suivi d'un espace puis d'un mois (pour éviter les dates)
 */
const pasSuiviDeMois: TextParser = (
  context: TextParserContext,
): string | undefined => {
  // Sauvegarder l'offset actuel
  const savedOffset = context.offset

  // Essayer de parser espace + mois
  const espaceResult = optional([espace], { default: null })(context)
  if (espaceResult !== null) {
    const moisResult = mois(context)
    // Restaurer l'offset
    context.offset = savedOffset
    context.length = 0

    if (moisResult !== undefined) {
      // On a trouvé un mois, donc échec de la vérification
      return undefined
    }
  } else {
    // Restaurer l'offset
    context.offset = savedOffset
    context.length = 0
  }

  // Pas de mois trouvé, succès
  return ""
}

/**
 * Numéro de portion d'article, par exemple « III » ou « c » ou « 3° »
 *
 * Au sein d'un article, une portion peut contenir des sous-…-portions ou des alinéas
 * NB: s'il s'avère plus utile lors de la réutilisation de mieux séparer et structurer
 *  ces différents cas, il faudrait découper cette règle en trois.
 */
export const numeroPortion = chain(
  [
    alternatives(
      convert(nombreRomainCardinal, {
        value: (result, context) => ({
          position: context.position(),
          text: context.text(),
          value: result as number,
        }),
      }),
      convert(lettreAsciiMinuscule, {
        value: (result, context) => ({
          position: context.position(),
          text: result as string,
          value: (result as string).charCodeAt(0) - "a".charCodeAt(0) + 1,
        }),
      }),
      chain([nombreCardinal, regExp("[°o]?", { flags: "i" })], {
        value: (results, context) => ({
          position: context.position(),
          text: context.text(),
          value: results[0] as number,
        }),
      }),
    ),
    optional([espace, adverbeMultiplicatifLatin], { default: null }),
    nonLettre,
    pasSuiviDeMois,
  ],
  {
    value: (results, context) => {
      const nombre0 = results[0] as TextAstNumber
      const nombre1 = (results[1] as [string, TextAstNumber] | null)?.[1]
      return {
        index:
          nombre0.value + (nombre1 === undefined ? 0 : nombre1.value / 1000),
        num: `${nombre0.text}${nombre1 === undefined ? "" : ` ${nombre1.text}`}`,
        position: context.position(),
        type: "item",
      }
    },
  },
)

/**
 * Portion désignée !
 * - soit par un adjectif relatif (par exemple « même alinéa)
 * - soit par un nombre ordinal écrit en lettres (par exemple « troisième phrase »)
 * - soit par un npmbre cardinal (par exemple « alinéa 3 »)
 */
export const unePortion = alternatives(
  chain(
    [
      optional(
        [
          regExp("même", {
            flags: "i",
          }),
          espace,
        ],
        { default: null },
      ),
      naturePortionSingulier,
      espace,
      convert(adjectifNumeralCardinal, {
        value: (result) => ({ index: result }) as TextAstLocalization,
      }),
    ],
    {
      value: (results, context) => ({
        ...(results[3] as TextAstPortion),
        position: context.position(),
        type: results[1] as PortionType,
      }),
    },
  ),
  chain(
    [
      alternatives(
        chain(
          [
            regExp("même", {
              flags: "i",
            }),
            espace,
            adjectifNumeralOrdinalLong,
          ],
          {
            value: (results) =>
              ({ index: results[2], relative: 0 }) as TextAstLocalization,
          },
        ),
        convert(adjectifNumeralOrdinalLong, {
          value: (result) => ({ index: result }) as TextAstLocalization,
        }),
        convert(adjectifRelatifSingulier, {
          value: (result) => result as TextAstLocalization,
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
  ),
)

/**
 * Parser pour gérer des formes comme "alinéas 2 et 3" ou "phrases 1, 2 et 3"
 * C'est-à-dire: naturePortionPluriel suivi d'une énumération de numéros
 */
export const quelquesPortionsNumerotees = chain(
  [
    naturePortionPluriel,
    espace,
    numeroPortion,
    repeat(
      [alternatives(separateurEnumeration, separateurPlage), numeroPortion],
      { min: 1 },
    ),
  ],
  {
    value: (results, context) => {
      const portionType = results[0] as PortionType
      const firstItem = results[2] as TextAstReference & { num?: string }
      const restItems = results[3] as Array<
        [CompoundReferencesSeparator, TextAstReference & { num?: string }]
      >

      // Position globale incluant "alinéas" / "phrases"
      const globalPosition = context.position()

      // Convertir tous les items pour leur donner le bon type et supprimer le champ num
      // Ajuster la position du premier item pour inclure le mot "alinéas"/"phrases"
      const { num: _firstNum, ...firstItemWithoutNum } = firstItem
      const typedFirstItem = {
        ...firstItemWithoutNum,
        type: portionType,
        position: {
          start: globalPosition.start,
          stop: firstItemWithoutNum.position.stop,
        },
      }

      const typedRestItems = restItems.map(([separator, item]) => {
        const { num: _itemNum, ...itemWithoutNum } = item
        return [separator, { ...itemWithoutNum, type: portionType }]
      }) as Array<[CompoundReferencesSeparator, TextAstReference]>

      return createEnumerationOrBoundedInterval(
        typedFirstItem,
        typedRestItems,
        globalPosition,
      )
    },
  },
)

export const numeroPortionOuUnePortion = alternatives(unePortion, numeroPortion)

export const plusieursPortions = chain(
  [
    adjectifNumeralCardinalLong,
    espace,
    convert(adjectifRelatifPluriel, {
      value: (result) => result as TextAstLocalization,
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
        results[1] as Array<[CompoundReferencesSeparator, TextAstReference]>,
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
    alternatives(
      numeroPortionOuUnePortion,
      plusieursPortions,
      quelquesPortionsNumerotees,
    ),
    repeat([
      alternatives(separateurEnumeration, separateurPlage),
      alternatives(numeroPortionOuUnePortion, plusieursPortions),
    ]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<[CompoundReferencesSeparator, TextAstReference]>,
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
        results[1] as Array<[CompoundReferencesSeparator, TextAstReference]>,
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

export const portionsEntreParenthesesOuVirgules = alternatives(
  chain(
    [
      espace,
      regExp(String.raw`\(`),
      espaceOuRien,
      listePortion,
      espaceOuRien,
      regExp(String.raw`\)`),
    ],
    { value: (results) => results[3] },
  ),
  chain([virgule, listePortion, regExp(",|$")], {
    value: (results) => results[1],
  }),
)

export const localisationPortion = alternatives(
  chain([liaisonSingulier, listePortion], { value: (results) => results[1] }),
  chain([liaisonPluriel, listePortions], { value: (results) => results[1] }),
  portionsEntreParenthesesOuVirgules,
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
        results[2] as TextAstReference,
        results[3] as TextAstAtomicReference[],
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

export const portionPrecisePluriel = chain(
  [
    portions,
    repeat([separateurEnumeration, alternatives(auxPortions, auPortion)]),
  ],
  {
    value: (results, context) =>
      createEnumerationOrBoundedInterval(
        results[0] as TextAstReference,
        results[1] as Array<[CompoundReferencesSeparator, TextAstReference]>,
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
        results[1] as Array<[CompoundReferencesSeparator, TextAstReference]>,
        context.position(),
      ),
  },
)
