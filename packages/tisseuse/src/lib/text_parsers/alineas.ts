import { type TextAstNombre } from "./ast.js"
import {
  adjectifNumeralOrdinal,
  adverbeMultiplicatif,
  nombreCardinal,
  nombreRomainCardinal,
} from "./numbers.js"
import { alternatives, chain, convert, optional, regExp } from "./parsers.js"
import { espace, lettreAsciiMinuscule, nonLettre } from "./typography.js"

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

export const unePortion = chain([
  alternatives(
    convert(adjectifNumeralOrdinal, { value: (result) => ({ id: result }) }),
  ),
])
TODO

// // [objet] Alinéa désigné soit par un adjectif relatif soit par un ordinal écrit en lettres, par exemple « même alinéa » ou « troisième alinéa »
// unePortion
//  = a:(
//      a1:adjectifNumeralOrdinal
//      { return { id: a1 }; }
//    / a2:adjectif_relatif_singulier
//      { return { indirect: a2 }; }
//    )
//    _
//    b:( "alinéa"i { return "alinéa"; } / "phrase"i { return "phrase"; } )
//    {
//      return {
//        type: b === "alinéa" ? "alinea-reference" : "sentence-reference",
//        ...a,
//        position: position(),
//        text: text(),
//      };
//    }

// // [object]
// alinea_precise_singulier = a : ( alinea ( separateurEnumeration ( aux_alineas / au_alinea ) )* ) {
//     return createEnumerationOrBoundedInterval( a[0], a[1], text(), position() );
//   }

// // [liste d’objects]
// alinea_precise_pluriel
//  = a:alineas
//    b:( separateurEnumeration ( aux_alineas / au_alinea ) )*
//    { return createEnumerationOrBoundedInterval( a, b, text(), position() ); }

// // [objet|liste d’objets]
// au_alinea
//  = intro_singulier
//    a:alinea
//    { return a; }

// // [objet|liste d’objets]
// aux_alineas
//  = intro_pluriel
//    a:alineas
//    { return a; }

// // [objet|liste d’objets]
// alinea
//  = a:dit_singulier?
//    b:liste_alinea
//    c:localisation_alinea*
//    {
//     if( c.length ) {
//       let res = c[c.length-1];
//       let orig = res;
//       for( let i = c.length-2; i >= 0; i-- ) {
//         res.child = c[i];
//         res = res.child;
//       }
//       res.child = b;
//       return orig;
//     } else {
//       return b;
//     }
//   }

// // [objet|liste d’objects]
// alineas
//  = a:dit_pluriel?
//    b:relatif_pluriel_prepose_?
//    c:liste_alineas
//    d:localisation_alinea*
//    {
//      if( d.length ) {
//        let res = d[d.length-1];
//        let orig = res;
//        for( let i = d.length-2; i >= 0; i-- ) {
//          res.child = d[i];
//          res = res.child;
//        }
//        res.child = c;
//        return orig;
//      } else {
//        return c;
//      }
//    }

// // [liste d’objects]
// localisation_alinea
//  = liaison_singulier a:liste_alinea { return a; }
//  / liaison_pluriel a:liste_alineas { return a; }
//  / alineas_entre_parentheses

// // [liste d’objects]
// alineas_entre_parentheses
//  = _ "(" espaceOuRien l:liste_alinea espaceOuRien ")"
//    { return l; }

// // TODO: plus réfléchir aux différentes formulations possibles – attention à ne pas capturer « [elle] les a [reconnus] » qui pourrait facilement devenir un faux positif dans la loi 78-17
// // [liste d’objects]
// liste_alinea
//  = a:( numero_portion_ou_unePortion / plusieurs_alineas_ou_phrases )
//    b:( ( separateurEnumeration / separateurPlage ) ( numero_portion_ou_unePortion / plusieurs_alineas_ou_phrases ) )*
//    { return createEnumerationOrBoundedInterval( a, b, text(), position() ); }

// // [liste d’objects]
// liste_alineas
//  = liste_plusieurs_alineas
//  / liste_quelques_alineas

// // [liste d’objects]
// liste_plusieurs_alineas
//  = a:plusieurs_alineas_ou_phrases
//    b:( ( separateurEnumeration / separateurPlage ) ( unePortion / plusieurs_alineas_ou_phrases ) )*
//    { return createEnumerationOrBoundedInterval( a, b, text(), position() ); }

// // [liste d’objects]
// liste_quelques_alineas
//  = a:( numero_portion_ou_unePortion / plusieurs_alineas_ou_phrases )
//    b:( ( separateurEnumeration / separateurPlage ) ( numero_portion_ou_unePortion / plusieurs_alineas_ou_phrases ) )+
//    { return createEnumerationOrBoundedInterval( a, b, text(), position() ); }

// // [objet]
// numero_portion_ou_unePortion
//  = unePortion
//  / numero_portion

// // [objet]
// plusieurs_alineas_ou_phrases
//  = a:adjectifNumeralCardinal
//    _
//    b:(
//        "premiers"i
//        { return { indirect: 1 }; }
//      / "premières"i
//        { return { indirect: 1 }; }
//      / "derniers"i
//        { return { indirect: -1 }; }
//      / "dernières"i
//        { return { indirect: -1 }; }
//      / b2:adjectif_relatif_pluriel
//        { return { indirect: b2 }; }
//    )
//    _
//    c:( "alinéas"i { return "alinéas"; } / "phrases"i { return "phrases"; } )
//    {
//      return {
//        type: "counted-interval-reference",
//        first: {
//          type: c === "alinéas" ? "alinea-reference" : "sentence-reference",
//          ...b,
//        },
//        count: a,
//        text: text(),
//        position: position(),
//      };
//    }
