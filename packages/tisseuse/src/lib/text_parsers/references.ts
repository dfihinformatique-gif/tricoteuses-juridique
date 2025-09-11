import { action } from "./actions.js"
import { article, articles } from "./articles.js"
import type {
  CompoundReferencesSeparator,
  TextAstAction,
  TextAstAtomicReference,
  TextAstParentChild,
  TextAstReference,
} from "./ast.js"
import { division, divisions } from "./divisions.js"
import {
  addChildLeftToLastChild,
  createEnumerationOrBoundedInterval,
  createParentChildTreeFromReferences,
} from "./helpers.js"
import { alternatives, chain, optional, regExp, repeat } from "./parsers.js"
import { portionPrecisePluriel, portionPreciseSingulier } from "./portions.js"
import {
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./prepositions.js"
import { separateurEnumeration, separateurExclusion } from "./separators.js"
import { texte } from "./texts.js"

export const uniteBasePluriel = alternatives(articles, divisions)

export const uniteBaseSingulier = alternatives(article, division, texte)

export const uniteBasePreciseePluriel = chain(
  [
    uniteBasePluriel,
    repeat(
      chain([liaisonSingulier, uniteBaseSingulier], {
        value: (results) => results[1] as TextAstReference,
      }),
    ),
  ],
  {
    value: (results, context) =>
      createParentChildTreeFromReferences(
        results[0] as TextAstReference,
        results[1] as TextAstAtomicReference[],
        context.position(),
      ),
  },
)

export const uniteBasePreciseeSingulier = chain(
  [
    uniteBaseSingulier,
    repeat(
      chain([liaisonSingulier, uniteBaseSingulier], {
        value: (results) => results[1] as TextAstReference,
      }),
    ),
  ],
  {
    value: (results, context) =>
      createParentChildTreeFromReferences(
        results[0] as TextAstReference,
        results[1] as TextAstAtomicReference[],
        context.position(),
      ),
  },
)

export const deUniteBasePreciseePluriel = chain(
  [liaisonPluriel, uniteBasePreciseePluriel],
  { value: (results) => results[1] as TextAstReference },
)

export const deUniteBasePreciseeSingulier = chain(
  [liaisonSingulier, uniteBasePreciseeSingulier],
  { value: (results) => results[1] as TextAstReference },
)

export const deUniteBasePrecisee = alternatives(
  deUniteBasePreciseeSingulier,
  deUniteBasePreciseePluriel,
)

export const referencePluriel2Internal = alternatives(
  chain(
    [portionPrecisePluriel, optional(deUniteBasePrecisee, { default: null })],
    {
      value: (results) => {
        const portion = results[0] as TextAstReference
        const reference = results[1] as TextAstReference | null
        return reference === null
          ? portion
          : addChildLeftToLastChild(reference, portion)
      },
    },
  ),
  uniteBasePreciseePluriel,
)

export const referenceSingulier2Internal = alternatives(
  chain(
    [portionPreciseSingulier, optional(deUniteBasePrecisee, { default: null })],
    {
      value: (results) => {
        const portion = results[0] as TextAstReference
        const reference = results[1] as TextAstReference | null
        return reference === null
          ? portion
          : addChildLeftToLastChild(reference, portion)
      },
    },
  ),
  uniteBasePreciseeSingulier,
)

export const referencePluriel1Internal = chain(
  [
    chain(
      [
        introPluriel,
        referencePluriel2Internal,
        optional(
          [
            optional(regExp(" modifiée?s", { flags: "i" }), { default: "" }),
            regExp(" susvisée?s", { flags: "i" }),
          ],
          { default: "" },
        ), // optional(regExp(String.raw` \([^)]+\)`, {flags: "i"}), { default: "" }),
      ],
      {
        value: (results, context) => ({
          ...(results[1] as TextAstReference),
          position: context.position(),
        }),
      },
    ),
    optional(action, { default: null }),
  ],
  {
    value: (results, context) =>
      results[1] === null
        ? (results[0] as TextAstReference)
        : {
            action: results[1] as TextAstAction,
            position: context.position(),
            reference: results[0] as TextAstReference,
            type: "reference_et_action",
          },
  },
)

export const referenceSingulier1Internal = chain(
  [
    chain(
      [
        introSingulier,
        referenceSingulier2Internal,
        optional(
          [
            optional(regExp(" modifiée?", { flags: "i" }), { default: "" }),
            regExp(" susvisée?", { flags: "i" }),
          ],
          { default: "" },
        ),
        // optional(regExp(String.raw` \([^)]+\)`, { flags: "i" }), {
        //   default: "",
        // }),
        optional(regExp(String.raw`, ?qui devient [^,]+ ","`, { flags: "i" }), {
          default: "",
        }),
      ],
      {
        value: (results, context) => ({
          ...(results[1] as TextAstReference),
          position: context.position(),
        }),
      },
    ),
    optional(action, { default: null }),
  ],
  {
    value: (results, context) =>
      results[1] === null
        ? (results[0] as TextAstReference)
        : {
            action: results[1] as TextAstAction,
            position: context.position(),
            reference: results[0] as TextAstReference,
            type: "reference_et_action",
          },
  },
)

export const reference1Internal = alternatives(
  referenceSingulier1Internal,
  referencePluriel1Internal,
)

export const reference = chain(
  [
    reference1Internal,
    repeat([
      alternatives(separateurExclusion, separateurEnumeration),
      reference1Internal,
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
