import {
  type CompoundReferencesSeparator,
  type LocalizationAdverb,
  type TextAstArticle,
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
import { adverbeMultiplicatif } from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  repeat,
} from "./parsers.js"
import { portionsEntreParentheses } from "./portions.js"
import { ditPluriel, ditSingulier } from "./prepositions.js"
import {
  adjectifRelatifPluriel,
  adjectifRelatifSingulier,
  espaceAdverbeRelatif,
  relatifPluriel,
  relatifPlurielPrepose,
  relatifSingulierPrepose,
} from "./relative_locations.js"
import { separateurEnumeration, separateurPlage } from "./separators.js"
import { espace } from "./typography.js"

/**
 * Nom spécifique d’un article, par exemple « liminaire »
 */
export const nomSpecialArticle = alternatives(
  regExp("annexe", { flags: "i", value: "annexe" }),
  regExp("exécution", { flags: "i", value: "exécution" }),
  regExp("liminaire", { flags: "i", value: "liminaire" }),
  regExp("préambule", { flags: "i", value: "préambule" }),
  regExp("préliminaire", { flags: "i", value: "préliminaire" }),
  regExp("unique", { flags: "i", value: "unique" }),
)

/**
 * Type d'un article, issu :
 * - issu d’une loi organique (L.O.),
 * - d’une loi (L.),
 * - d’un décret pris en Conseil d’État (R.),
 * - d’un décret simple (D.),
 * - d’un arrêté (A.) ;
 * Une étoile à la suite mentionne un décret pris en
 * Conseil des ministres, par exemple « L.O. » ou « D*. »
 */
export const typeArticle = chain(
  [
    regExp(String.raw`\*?\*?`),
    optional(
      [
        alternatives(
          [regExp(String.raw`L\.?O`, { value: "LO" }), regExp(String.raw`\*?`)],
          regExp(String.raw`([ARDL]|LO)\*?`),
        ),
        regExp(String.raw`\*?\*?`),
        regExp(String.raw`\.?\ ?`, { value: "" }),
      ],
      { default: "" },
    ),
  ],
  { value: (results, context) => context.textFromResults(results) },
)

/**
 * Numéro générique d’article, par exemple « L.O 113-1 » ou « L328-1 A bis-0 » ou « préliminaire »
 */
export const nomArticle = alternatives(
  chain(
    [
      typeArticle,
      regExp(String.raw`\d+`),
      optional(regExp("(ème|e?r?)", { value: "" }), { default: "" }),
      repeat([
        alternatives(regExp(" ?- ?"), regExp(String.raw` ?\.`), espace),
        alternatives(
          [
            regExp(String.raw`[\dA-Z]+`),
            optional(regExp("(ème|e?r?)", { value: "" }), { default: "" }),
          ],
          convert(adverbeMultiplicatif, {
            value: (result) => (result as TextAstNumber).text,
          }),
        ),
      ]),
    ],
    { value: (results, context) => context.textFromResults(results) },
  ),
  nomSpecialArticle,
)

/**
 * Désignation d’un article, de façon absolue (avec son numero ou nom) ou relative (précédent, suivant, …)
 */
export const designationArticle = alternatives(
  chain(
    [
      chain([nomArticle, optional(espaceAdverbeRelatif, { default: null })], {
        value: (results, context) => ({
          ...(results[1]
            ? { localizationAdverb: results[1] as LocalizationAdverb }
            : {}),
          num: results[0] as string,
          position: context.position(),
          type: "article",
        }),
      }),
      optional(portionsEntreParentheses, { default: null }),
    ],
    {
      value: (results, context) => {
        const article = results[0] as TextAstArticle
        const portion = results[1] as TextAstReference | null
        return portion === null
          ? article
          : {
              child: portion,
              parent: article,
              position: context.position(),
              type: "parent-enfant",
            }
      },
    },
  ),
  convert(adjectifRelatifSingulier, {
    value: (result, context) => ({
      localization: result as TextAstLocalization,
      position: context.position(),
      type: "article",
    }),
  }),
)

export const listeArticles1Internal = convert(adjectifRelatifPluriel, {
  value: (result, context) => ({
    localization: result as TextAstLocalization,
    position: context.position(),
    type: "article",
  }),
})

/**
 * Liste d’articles, comprenant au minimum deux articles
 */
export const listeArticles = chain(
  [
    designationArticle,
    repeat(
      [
        alternatives(separateurEnumeration, separateurPlage),
        alternatives(listeArticles1Internal, designationArticle),
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

export const articles2Internal = alternatives(
  listeArticles,
  convert(relatifPluriel, {
    value: (result, context) => ({
      localization: result as TextAstLocalization,
      position: context.position(),
      type: "article",
    }),
  }),
)

export const articles1Internal = alternatives(
  chain(
    [
      relatifPlurielPrepose,
      espace,
      regExp("articles", { flags: "i" }),
      optional([espace, articles2Internal], { default: [] }),
    ],
    {
      value: (results, context) => {
        const base = (results[3] as [string, TextAstReference])[1] ?? {
          position: context.position(),
          type: "article",
        }
        for (const article of iterAtomicFirstParentReferences<
          TextAstArticle | TextAstIncompleteHeader
        >(base)) {
          if (article.type === "incomplete-header") {
            ;(article as unknown as TextAstArticle).type = "article"
          }
          if (article.localization === undefined) {
            article.localization = results[0] as TextAstLocalization
          }
        }
        return { ...base, position: context.position() }
      },
    },
  ),
  chain([regExp("articles", { flags: "i" }), espace, articles2Internal], {
    value: (results, context) => ({
      ...(results[2] as TextAstReference),
      position: context.position(),
    }),
  }),
)

/**
 * Règle principale pour la reconnaissance d’une liste d’articles
 */
export const articles = chain(
  [optional(ditPluriel, { default: false }), articles1Internal],
  {
    value: (results, context) => {
      const base = results[1] as TextAstReference
      if (results[0]) {
        for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
          base,
        )) {
          article.ofTheSaid = true
        }
      }
      for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
        base,
      )) {
        if (context.currentText !== undefined) {
          article.implicitText = context.currentText
        }
      }
      // When there are several articles, there is no currentArticle.
      delete context.currentArticle
      return {
        ...base,
        position: context.position(),
      }
    },
  },
)

export const article1Internal = alternatives(
  chain(
    [
      relatifSingulierPrepose,
      espace,
      regExp("article", { flags: "i" }),
      optional([espace, designationArticle], { default: [] }),
    ],
    {
      value: (results, context) => {
        const base = (results[3] as [string, TextAstReference])[1] ?? {
          position: context.position(),
          type: "article",
        }
        // Que faire d’une éventuelle expression « aux mêmes articles suivants » ?
        // Tel que codé ci-dessous, le « mêmes » est ignoré au profit du « suivants »
        for (const article of iterAtomicFirstParentReferences<
          TextAstArticle | TextAstIncompleteHeader
        >(base)) {
          if (article.type === "incomplete-header") {
            ;(article as unknown as TextAstArticle).type = "article"
          }
          if (article.localization === undefined) {
            article.localization = results[0] as TextAstLocalization
          }
        }
        return { ...base, position: context.position() }
      },
    },
  ),
  chain([regExp("article", { flags: "i" }), espace, designationArticle], {
    value: (results, context) => ({
      ...(results[2] as TextAstReference),
      position: context.position(),
    }),
  }),
)

/**
 * Règle principale pour la reconnaissance d’un seul article
 */
export const article = chain(
  [optional(ditSingulier, { default: null }), article1Internal],
  {
    value: (results, context) => {
      const base = results[1] as TextAstArticle | TextAstParentChild
      if (results[0]) {
        for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
          base,
        )) {
          article.ofTheSaid = true
        }
      }
      for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
        base,
      )) {
        if (context.currentText !== undefined) {
          article.implicitText = context.currentText
        }
      }
      const articleOrParentChild = {
        ...base,
        position: context.position(),
      }
      context.currentArticle =
        articleOrParentChild.type === "parent-enfant"
          ? (articleOrParentChild.parent as TextAstArticle)
          : articleOrParentChild
      return articleOrParentChild
    },
  },
)
