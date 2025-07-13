import { type TextAstNombre, type TextAstLocalisation } from "./ast.js"
import { adverbeMultiplicatif } from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  repeat,
} from "./parsers.js"
import {
  adjectifRelatifSingulier,
  espaceAdverbeRelatif,
} from "./relative_locations.js"
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
    alternatives(
      [regExp(String.raw`L\.O`, { value: "LO" }), regExp(String.raw`\*?`)],
      regExp(String.raw`([ARDL]|LO)\*?`),
    ),
    regExp(String.raw`\.?\ `, { value: "" }),
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
            value: (result) => (result as TextAstNombre).id,
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
      nomArticle,
      optional(espaceAdverbeRelatif, { default: "" }),
      optional(alineasEntreParentheses, { default: "" }),
    ],
    {
      value: (results, context) => ({
        ...(results[1] ? { adverb: results[1] } : {}),
        ...(results[2] ? { child: results[2] } : {}),
        id: results[0] as string,
        position: context.position(),
        type: "article",
      }),
    },
  ),
  convert(adjectifRelatifSingulier, {
    value: (result, context) => ({
      localization: result as TextAstLocalisation,
      position: context.position(),
      type: "article",
    }),
  }),
)

// // [objet] Règle principale pour la reconnaissance d’un seul article
// article
//  = dit:dit_singulier?
//    a:article1_priv
//    { if( dit ) {
//        for (const ref of iterAtomicReferences(a)) {
//          ref.dit = dit;
//        }
//      }
//      return a;
//    }

// // [objet] Règle annexe à article
// article1_priv
//  = r:relatif_singulier_prepose _ "article" a:( _ designation_article )?
//    { const base = a ? a[1] : { type: "article-reference", position: position() };
//      // Que faire d’une éventuelle expression « aux mêmes articles suivants » ?
//      // Tel que codé ci-dessous, le « mêmes » est ignoré au profit du « suivants »
//      for (const ref of iterAtomicReferences(base)) {
//        if (!ref.indirect) ref.indirect = r;
//      }
//      return base;
//    }
//  / "article" _ a:designation_article
//    { return a; }

// // [liste d’objets] Règle principale pour la reconnaissance d’une liste d’articles
// articles
//  = dit:dit_pluriel?
//    a:articles1_priv
//    { if( dit ) {
//        for (const ref of iterAtomicReferences(a)) {
//          ref.dit = dit;
//        }
//      }
//      return a;
//    }

// // [liste d’objets] Règle annexe à articles
// articles1_priv
//  = r:relatif_pluriel_prepose _ "articles" a:( _ articles2_priv )?
//    { const base = a ? a[1] : { type: "article-reference", position: position() };
//      // Que faire d’une éventuelle expression « aux mêmes articles suivants » ?
//      // Tel que codé ci-dessous, le « mêmes » est ignoré au profit du « suivants »
//      for (const ref of iterAtomicReferences(base)) {
//        if (!ref.indirect) ref.indirect = r;
//      }
//      return base;
//    }
//  / "articles" _ a:articles2_priv
//    { return a; }

// // [liste d’objets] Règle annexe à articles1_priv
// articles2_priv
//  = a:liste_articles
//    { return a; }
//  / r:relatif_pluriel
//    { return { type: "article-reference", indirect: r, position: position() }; }

// // [liste d’objets] Liste d’articles, comprenant au minimum deux articles
// liste_articles
//  = a:designation_article
//    b:( ( separateurEnumeration / separateurPlage ) ( liste_articles1_priv / designation_article ) )+
//    { return createEnumerationOrBoundedInterval( a, b, text(), position() ); }

// // [objet] Règle annexe à liste_articles
// liste_articles1_priv
//  = a:adjectif_relatif_pluriel
//    { return { type: "article-reference", indirect: a, position: position() }; }
