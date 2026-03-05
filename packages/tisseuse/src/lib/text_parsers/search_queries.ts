import type {
  TextAstArticle,
  TextAstParentChild,
  TextAstPosition,
  TextAstText,
} from "./ast.js"
import { alternatives, chain, convert, optional, regExp } from "./parsers.js"
import { nomArticle, nomSpecialArticle } from "./articles.js"
import { texteEuropeen, texteFrancais } from "./texts.js"
import { espace } from "./typography.js"

export const searchArticleKeyword = regExp(
  "art(?:icle|icl|ic|i|s)?\\.?|al(?:inéa|inea|in|i)?\\.?",
  { flags: "i" },
)

export const searchArticle = chain(
  [
    searchArticleKeyword,
    optional(espace, { default: "" }),
    alternatives(nomArticle, nomSpecialArticle),
  ],
  {
    value: (results, context): TextAstArticle => ({
      num: results[2] as string,
      position: context.position(),
      type: "article",
    }),
  },
)

export const searchTexteAbbreviations = alternatives(
  regExp("c(?:ode|\\.)? ?civ(?:il)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006070721",
        nature: "CODE",
        position: context.position(),
        title: "Code civil",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?trav(?:ail)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006072050",
        nature: "CODE",
        position: context.position(),
        title: "Code du travail",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?p[eé]n(?:al)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        position: context.position(),
        title: "Code pénal",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?pr(?:oc(?:[eé]dure)?)? ?p[eé]n(?:al)?|cpp", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006071154",
        nature: "CODE",
        position: context.position(),
        title: "Code de procédure pénale",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?pr(?:oc(?:[eé]dure)?)? ?civ(?:il)?|cpc", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006070716",
        nature: "CODE",
        position: context.position(),
        title: "Code de procédure civile",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?s[eé]cur(?:it[eé])? ?soc(?:iale)?|css", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006073189",
        nature: "CODE",
        position: context.position(),
        title: "Code de la sécurité sociale",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?rur(?:al)?(?: et de la p[êe]che maritime)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006071367",
        nature: "CODE",
        position: context.position(),
        title: "Code rural et de la pêche maritime",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?env(?:ironnement)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006074220",
        nature: "CODE",
        position: context.position(),
        title: "Code de l'environnement",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?urb(?:anisme)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006074075",
        nature: "CODE",
        position: context.position(),
        title: "Code de l'urbanisme",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?jus(?:tice)? ?adm(?:in(?:istrative)?)?|cja", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006070933",
        nature: "CODE",
        position: context.position(),
        title: "Code de justice administrative",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("cgi", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: context.position(),
        title: "Code général des impôts",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
  regExp("c(?:ode|\\.)? ?com(?:merce)?", {
    flags: "i",
    value: (_match, context) =>
      ({
        cid: "LEGITEXT000005634379",
        nature: "CODE",
        position: context.position(),
        title: "Code de commerce",
        type: "texte",
      }) as TextAstText & TextAstPosition,
  }),
)

export const searchTexte = alternatives(
  searchTexteAbbreviations,
  // texteFrancais and texteEuropeen don't include position in their results,
  // so we add it here using convert().
  convert(texteFrancais, {
    value: (result, context) =>
      result === undefined
        ? undefined
        : { ...(result as TextAstText), position: context.position() },
  }),
  convert(texteEuropeen, {
    value: (result, context) => ({
      ...(result as TextAstText),
      position: context.position(),
    }),
  }),
)

const liaisonOptionnelle = optional(
  regExp(" (?:du |de la |de l'|des |de |d')?", { flags: "i" }),
  { default: "" },
)

export const searchTexteLibreAvantArticle = regExp(
  ".+?(?=\\s*(?:du |de la |de l'|des |de |d')?\\s*(?:art(?:icle|icl|ic|i|s)?\\.?|al(?:inéa|inea|in|i)?\\.?))",
  {
    flags: "i",
    value: (match, context) =>
      ({
        type: "texte",
        title: match[0].trim(),
        position: context.position(),
      }) as TextAstText & TextAstPosition,
  },
)

export const searchTexteLibreApresArticle = regExp(".+", {
  flags: "i",
  value: (match, context) =>
    ({
      type: "texte",
      title: match[0].trim(),
      position: context.position(),
    }) as TextAstText & TextAstPosition,
})

export const searchQueryReference = alternatives(
  // Texte + Article (ex: Code civil art 2)
  chain([searchTexte, liaisonOptionnelle, searchArticle], {
    value: (results, context): TextAstParentChild => {
      const text = results[0] as TextAstText & TextAstPosition
      const article = results[2] as TextAstArticle
      return {
        child: article,
        parent: text,
        position: context.position(),
        type: "parent-enfant",
      }
    },
  }),
  // Article + Texte (ex: art 2 Code civil)
  chain([searchArticle, liaisonOptionnelle, searchTexte], {
    value: (results, context): TextAstParentChild => {
      const article = results[0] as TextAstArticle
      const text = results[2] as TextAstText & TextAstPosition
      return {
        child: article,
        parent: text,
        position: context.position(),
        type: "parent-enfant",
      }
    },
  }),
  // Texte libre + Article (ex: loi informatique et liberté 1978 art 6)
  chain([searchTexteLibreAvantArticle, liaisonOptionnelle, searchArticle], {
    value: (results, context): TextAstParentChild => {
      const text = results[0] as TextAstText & TextAstPosition
      const article = results[2] as TextAstArticle
      return {
        child: article,
        parent: text,
        position: context.position(),
        type: "parent-enfant",
      }
    },
  }),
  // Article + Texte libre (ex: art 6 loi informatique et liberté 1978)
  chain([searchArticle, liaisonOptionnelle, searchTexteLibreApresArticle], {
    value: (results, context): TextAstParentChild => {
      const article = results[0] as TextAstArticle
      const text = results[2] as TextAstText & TextAstPosition
      return {
        child: article,
        parent: text,
        position: context.position(),
        type: "parent-enfant",
      }
    },
  }),
  searchArticle,
  searchTexte,
  searchTexteLibreApresArticle,
)
