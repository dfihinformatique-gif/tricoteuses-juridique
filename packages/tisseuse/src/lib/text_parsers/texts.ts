import {
  type EuropeanLawNature,
  type FrenchLawNature,
  type TextAstLaw,
  type TextAstLawIdentification,
  type TextAstTextInfos,
  type TextInfosByWordsTree,
} from "./ast.js"
import { duDate, espaceDuDate } from "./dates.js"
import { nombreCardinal } from "./numbers.js"
import {
  alternatives,
  chain,
  convert,
  optional,
  regExp,
  wordsTree,
} from "./parsers.js"
import { ditSingulier } from "./prepositions.js"
import { espacePrecite, relatifSingulierPrepose } from "./relative_locations.js"
import textInfosByTitleWordsTree from "./texts_titles.json" with { type: "json" }
import { espace, numero } from "./typography.js"

// Textes français

/**
 * Identifiant d’un texte français, par exemple « 2001-692 »
 */
export const identifiantTexteFrancais = regExp(String.raw`\d+-\d+`)

/**
 * Symbole « n° » + identifiant d’un texte français, par exemple « n° 2001-692 »
 */
export const numeroTexteFrancais = chain([numero, identifiantTexteFrancais], {
  value: (results) => results[1],
})

export const identificationTexteFrancais = alternatives(
  chain([numeroTexteFrancais, optional(espaceDuDate, { default: "" })], {
    value: (results) =>
      results[1]
        ? { lawDate: results[1] as string, num: results[0] as string }
        : { num: results[0] as string },
  }),
  convert(duDate, {
    value: (result) => ({ lawDate: result as string }),
  }),
)

/**
 * Nature d’un texte français, par exemple « code » ou « loi organique »
 *
 * Note: Une majuscule est nécessaire à Constitution pour éviter des faux positifs
 * comme "Les quantités qui contribuent à la constitution d’une capacité d’effacement".
 */
export const natureTexteFrancais = chain(
  [
    alternatives(
      regExp("arrêté", { flags: "i", value: "ARRETE" }),
      regExp("circulaire", { flags: "i", value: "CIRCULAIRE" }),
      regExp("code", { flags: "i", value: "CODE" }),
      regExp("Constitution", { value: "CONSTITUTION" }),
      regExp("décret-loi", { flags: "i", value: "DECRET_LOI" }),
      regExp("décret", { flags: "i", value: "DECRET" }),
      regExp("loi constitutionnelle", {
        flags: "i",
        value: "LOI_CONSTIT",
      }),
      regExp("loi organique", { flags: "i", value: "LOI_ORGANIQUE" }),
      regExp("loi", { flags: "i", value: "LOI" }),
      regExp("ordonnance", { flags: "i", value: "ORDONNANCE" }),
    ),
  ],
  {
    value: (results) => ({
      nature: results[0] as FrenchLawNature,
      type: "law",
    }),
  },
)

export const decisionConseilConstitutionnel = regExp(
  "décision( du Conseil constitutionnel)? (?<numero>[-/0-9A-Z]+ (QPC|DC|AN|D|ELEC|FNR|I|LOM|LP|L|ORGA|PDR|REF|SEN|AUTR|AR16))",
  {
    flags: "i",
    value: (match, context) => ({
      id: match.groups!.numero,
      position: context.position(),
      type: "décision du Conseil constitutionnel",
    }),
  },
)

/**
 * Règle principale pour la reconnaissance d’un texte français
 *
 * Note: Une majuscule est nécessaire à Constitution pour éviter des faux positifs
 * comme "Les quantités qui contribuent à la constitution d’une capacité d’effacement".
 */
export const texteFrancais = alternatives(
  chain(
    [
      wordsTree(textInfosByTitleWordsTree as TextInfosByWordsTree),
      optional(espacePrecite, { default: "" }),
    ],
    {
      value: (results) => ({
        ...(results[0] as TextAstTextInfos),
        ...(results[1] ? { lawDate: results[1] as string } : {}),
        type: "law",
      }),
    },
  ),
  chain(
    [
      regExp("Constitution"),
      optional(espaceDuDate, { default: "" }),
      optional(espacePrecite, { default: "" }),
    ],
    {
      value: (results) => ({
        cid: "JORFTEXT000000571356",
        ...(results[1] ? { lawDate: results[1] as string } : {}),
        nature: "CONSTITUTION",
        title: "Constitution",
        type: "law",
      }),
    },
  ),
  chain(
    [
      natureTexteFrancais,
      espace,
      identificationTexteFrancais,
      optional(espacePrecite, { default: "" }),
    ],
    {
      value: (results) => ({
        ...(results[0] as TextAstLaw),
        ...(results[2] as TextAstLawIdentification),
      }),
    },
  ),
)

// Textes européens

/**
 * Identifiant d’un texte européen, par exemple « 2002/22/CE »
 */
export const identifiantTexteEuropeen = chain(
  [
    nombreCardinal,
    regExp("/"),
    nombreCardinal,
    optional(regExp(" ?/ ?(CEE?)", { value: (match) => match[1] }), {
      default: "",
    }),
  ],
  {
    value: (results) =>
      `${results[0]}/${results[2]}${results[3] ? `/${results[3]}` : ""}`,
  },
)

/**
 * Numéro d’un texte européen, par exemple « n° 2002/22/CE » ou « 2002/22/CE »
 */
export const numeroTexteEuropeen = chain(
  [optional(numero, { default: "" }), identifiantTexteEuropeen],
  { value: (results) => results[1] },
)

/**
 * Identification d’un texte européen, c’est-à-dire son numero et/ou sa date (sa nature est traitée ailleurs)
 */
export const identificationTexteEuropeen = alternatives(
  chain([numeroTexteEuropeen, optional(espaceDuDate, { default: "" })], {
    value: (results) =>
      results[1]
        ? { lawDate: results[1] as string, num: results[0] as string }
        : { num: results[0] as string },
  }),
  convert(duDate, {
    value: (result) => ({ lawDate: result as string }),
  }),
)

/**
 * Nature d’un texte européen, par exemple « règlement (UE) »
 */
export const natureTexteEuropeen = chain(
  [
    alternatives(
      regExp("directive", { flags: "i", value: "DIRECTIVE_EURO" }),
      regExp("règlement", { flags: "i", value: "REGLEMENTEUROPEEN" }),
    ),
    optional(regExp(String.raw` \(UE\)`, { flags: "i" }), { default: "" }),
  ],
  {
    value: (results) => ({
      nature: results[0] as EuropeanLawNature,
      legislation: "UE",
      type: "law",
    }),
  },
)

/**
 * Règle principale pour la reconnaissance d’un texte européen
 */
export const texteEuropeen = chain(
  [natureTexteEuropeen, espace, identificationTexteEuropeen],
  {
    value: (results) => ({
      ...(results[2] as TextAstLawIdentification),
      ...(results[0] as TextAstLaw),
    }),
  },
)

// Textes internationaux

export const texteInternational = regExp("convention", {
  flags: "i",
  value: {
    nature: "CONVENTION",
    legislation: "international",
    type: "law",
  },
})

// Règle principale

export const texte = chain(
  [
    optional(ditSingulier, { default: false }),
    alternatives(
      chain(
        [
          relatifSingulierPrepose,
          espace,
          alternatives(
            texteFrancais,
            texteEuropeen,
            texteInternational,
            natureTexteFrancais,
            natureTexteEuropeen,
          ),
        ],
        {
          value: (results) => ({
            ...(results[2] as TextAstLaw),
            ...(results[0] === undefined ? {} : { localization: results[0] }),
          }),
        },
      ),
      texteFrancais,
      texteEuropeen,
      texteInternational,
    ),
  ],
  {
    value: (results, context) => ({
      ...(results[1] as TextAstLaw),
      ...(results[0] ? { ofTheSaid: true } : {}),
      position: context.position(),
    }),
  },
)
