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
import { adverbeMultiplicatifLatin } from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  repeat,
} from "./parsers.js"
import { portionsEntreParenthesesOuVirgules } from "./portions.js"
import {
  adjectifTemporelSingulier,
  ditPluriel,
  ditSingulier,
} from "./prepositions.js"
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
export const nomSpecialArticle = regExp(
  "annexe|exécution|liminaire|préambule|préliminaire|premier|unique",
  {
    flags: "i",
    value: (match) => {
      const text = match[0].toLowerCase()
      if (text === "premier" || text === "unique") return "1"
      return text
    },
  },
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
      optional(regExp("(ème|er|e|r)", { value: "" }), { default: "" }),
      repeat([
        alternatives(regExp(" ?- ?"), regExp(String.raw` ?\.`), espace),
        alternatives(
          [
            regExp(String.raw`[\dA-Z]+`),
            optional(regExp("(ème|er|e|r)", { value: "" }), { default: "" }),
          ],
          convert(adverbeMultiplicatifLatin, {
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
 * Numéro d’article, utilisé lors de sa définition,
 * par exemple « L.O 113-1 » ou « L328-1 A bis-0 » ou « préliminaire »
 * Attention cette règle est plus stricte que nomArticle, car, par exemple,
 * dans la ligne :
 *  « Art. 235 ter XB - I. - 1. Il est institué une taxe […]
 * le numéro est 235 ter XB et I. et 1. sont des numéros de portions.
 */
export const nomArticleDefinition = alternatives(
  chain(
    [
      typeArticle,
      regExp(String.raw`\d+`),
      optional(regExp("(ème|er|e|r)", { value: "" }), { default: "" }),
      repeat([
        alternatives(regExp("-"), regExp(String.raw` ?\.`), espace),
        alternatives(
          [
            regExp(String.raw`[\dA-Z]+`),
            optional(regExp("(ème|er|e|r)", { value: "" }), { default: "" }),
          ],
          convert(adverbeMultiplicatifLatin, {
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
 * Numéro d’article à l'intérieur d'un projet ou d'une proposition de loi
 *
 * Dans un projet (ou une proposition) de loi initial, un numéro d'article
 * est un simple nombre ou un nom spécial.
 * Dans les versions suivantes, le numéro d'article est un nombre éventuellement
 * suivi d'un adverbe multiplicatif latin.
 */
export const nomArticleProjetOuPropositionLoi = alternatives(
  chain(
    [
      regExp(String.raw`\d+`),
      optional(regExp("(ème|er|e|r)", { value: "" }), { default: "" }),
      optional([espace, adverbeMultiplicatifLatin], {
        default: "",
        value: (results) => " " + (results as [string, TextAstNumber])[1].text,
      }),
      optional(regExp(String.raw` \(nouveau\)`, { flags: "i" }), {
        default: "",
      }),
    ],
    { value: (results, context) => context.textFromResults(results) },
  ),
  nomSpecialArticle,
)

/**
 * Déclaration d'un article au sein d'une citation dans un projet
 * ou une proposition de loi
 * Exemple : « Art. L. 322‑66. - blablabla… en début de ligne
 */
export const definitionArticleDansCitation = chain(
  [
    chain(
      [regExp(String.raw`^art\. `, { flags: "im" }), nomArticleDefinition],
      {
        value: (results, context) => ({
          definition: true,
          num: results[1] as string,
          position: context.position(),
          type: "article",
        }),
      },
    ),
    regExp(String.raw`\.? ?- ?`),
  ],
  {
    value: (results) => results[0],
  },
)

/**
 * Déclaration d'un article dans un projet ou une proposition de loi
 * Exemple : « Article 2 » en début de ligne
 */
export const definitionArticleDansProjetOuPropositionLoi = chain(
  [
    chain(
      [
        regExp("^article", { flags: "im" }),
        espace,
        nomArticleProjetOuPropositionLoi,
      ],
      {
        value: (results, context) => ({
          definition: true,
          num: results[2] as string,
          position: context.position(),
          type: "article",
        }),
      },
    ),
    regExp("( :)?$", { flags: "m" }),
  ],
  {
    value: (results) => {
      const definition = results[0] as TextAstArticle
      if (results[1]) {
        definition.definitionSuffix = results[1] as string
      }
      return definition
    },
  },
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
      optional(portionsEntreParenthesesOuVirgules, { default: null }),
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
      ...(result as TextAstLocalization),
      position: context.position(),
      type: "article",
    }),
  }),
)

export const listeArticles1Internal = convert(adjectifRelatifPluriel, {
  value: (result, context) => ({
    ...(result as TextAstLocalization),
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
      ...(result as TextAstLocalization),
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
          if (
            article.index === undefined &&
            article.relative === undefined &&
            !article.present
          ) {
            Object.assign(article, results[0] as TextAstLocalization)
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
      if (context.currentText !== undefined) {
        for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
          base,
        )) {
          if (article.implicitText === undefined) {
            article.implicitText = context.currentText
          }
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
      optional(adjectifTemporelSingulier, { default: null }),
      regExp("article", { flags: "i" }),
      optional([espace, designationArticle], { default: [] }),
    ],
    {
      value: (results, context) => {
        const newOrOld = results[2] as "new" | "old" | null
        const base = (results[4] as [string, TextAstReference])[1] ?? {
          position: context.position(),
          type: "article",
        }
        // Que faire d'une éventuelle expression « aux mêmes articles suivants » ?
        // Tel que codé ci-dessous, le « mêmes » est ignoré au profit du « suivants »
        for (const article of iterAtomicFirstParentReferences<
          TextAstArticle | TextAstIncompleteHeader
        >(base)) {
          if (article.type === "incomplete-header") {
            ;(article as unknown as TextAstArticle).type = "article"
          }
          if (
            article.index === undefined &&
            article.relative === undefined &&
            !article.present
          ) {
            Object.assign(article, results[0] as TextAstLocalization)
          }
          if (newOrOld !== null) {
            ;(article as TextAstArticle).newOrOld = newOrOld
          }
        }
        return { ...base, position: context.position() }
      },
    },
  ),
  chain(
    [
      optional(adjectifTemporelSingulier, { default: null }),
      regExp("article", { flags: "i" }),
      espace,
      designationArticle,
    ],
    {
      value: (results, context) => {
        const newOrOld = results[0] as "new" | "old" | null
        const base = results[3] as TextAstReference
        if (newOrOld !== null) {
          for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
            base,
          )) {
            article.newOrOld = newOrOld
          }
        }
        return {
          ...base,
          position: context.position(),
        }
      },
    },
  ),
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
      if (context.currentText !== undefined) {
        for (const article of iterAtomicFirstParentReferences<TextAstArticle>(
          base,
        )) {
          if (article.implicitText === undefined) {
            article.implicitText = context.currentText
          }
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
