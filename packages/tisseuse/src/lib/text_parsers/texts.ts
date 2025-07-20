import {
  type EuropeanLawNature,
  type FrenchLawNature,
  type TextAstText,
  type TextAstTextIdentification,
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
import textTitlesInfos from "./text_titles_infos.json" with { type: "json" }
import { espace, numero } from "./typography.js"

const textInfosByCid =
  (
    textTitlesInfos as {
      textInfosByCid?: Record<
        string,
        {
          nature: string
          title: string
        }
      >
    }
  ).textInfosByCid ?? {}
const textCidByOtherTitleWordsTree =
  (textTitlesInfos as { textCidByOtherTitleWordsTree?: TextAstTextInfos })
    .textCidByOtherTitleWordsTree ?? {}
const textCidByStandardTitleWordsTree =
  (textTitlesInfos as { textCidByStandardTitleWordsTree?: TextAstTextInfos })
    .textCidByStandardTitleWordsTree ?? {}
const textsCidsByNatureAndDate =
  (
    textTitlesInfos as {
      textsCidsByNatureAndDate: Record<string, Record<string, string[]>>
    }
  ).textsCidsByNatureAndDate ?? {}
const textsCidsByNatureAndNum =
  (
    textTitlesInfos as {
      textsCidsByNatureAndNum: Record<string, Record<string, string[]>>
    }
  ).textsCidsByNatureAndNum ?? {}

// Textes français

/**
 * Nature d’un texte français, par exemple « code » ou « loi organique »
 *
 * Note: Une majuscule est nécessaire à Constitution pour éviter des faux positifs
 * comme "Les quantités qui contribuent à la constitution d’une capacité d’effacement".
 */
export const natureTexteFrancais = convert(
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
    regExp("loi de programme", { flags: "i", value: "LOI" }),
    regExp("loi locale", { flags: "i", value: "LOI" }),
    regExp("loi organique", { flags: "i", value: "LOI_ORGANIQUE" }),
    regExp("loi", { flags: "i", value: "LOI" }),
    regExp("ordonnance (du Roi|ministérielle|royale)", {
      flags: "i",
      value: "ORDONNANCE",
    }),
    regExp("ordonnance", { flags: "i", value: "ORDONNANCE" }),
  ),
  {
    value: (result) => ({
      nature: result as FrenchLawNature,
      type: "texte",
    }),
  },
)

/**
 * Symbole « n° » + identifiant d’un texte français, par exemple « n° 2001-692 »
 */
export const numeroTexteFrancais = chain(
  [numero, regExp(String.raw`\d+(-\d+)?`)],
  {
    value: (results) => results[1],
  },
)

export const numeroEtOuDateTexteFrancais = alternatives(
  chain([numeroTexteFrancais, optional(espaceDuDate, { default: "" })], {
    value: (results) =>
      results[1]
        ? { date: results[1] as string, num: results[0] as string }
        : { num: results[0] as string },
  }),
  convert(duDate, {
    value: (result) => ({ date: result as string }),
  }),
)

export const decisionConseilConstitutionnel = regExp(
  "décision( du Conseil constitutionnel)? (?<numero>[-/0-9A-Z]+ (QPC|DC|AN|D|ELEC|FNR|I|LOM|LP|L|ORGA|PDR|REF|SEN|AUTR|AR16))",
  {
    flags: "i",
    value: (match, context) => ({
      num: match.groups!.numero,
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
      natureTexteFrancais,
      optional([espace, numeroEtOuDateTexteFrancais], {
        default: null,
        value: (results) => (results as [string, TextAstTextIdentification])[1],
      }),
      optional(
        [
          espace,
          wordsTree(textCidByStandardTitleWordsTree as TextInfosByWordsTree),
        ],
        {
          default: null,
          value: (results) => (results as [string, TextAstTextInfos])[1],
        },
      ),
      optional(
        [
          regExp(String.raw` ?\( ?`),
          numeroEtOuDateTexteFrancais,
          regExp(String.raw` ?)`),
        ],
        {
          default: null,
          value: (results) =>
            (results as [string, TextAstTextIdentification, string])[1],
        },
      ),
      optional(espacePrecite, { default: "" }),
    ],
    {
      value: (results) => {
        const { nature, type } = results[0] as TextAstText
        const { date, num } = (results[1] ??
          results[3] ??
          {}) as TextAstTextIdentification
        const { cid } = (results[2] ?? {}) as TextAstTextInfos
        if (cid === undefined && date === undefined && num === undefined) {
          return undefined
        }

        let foundCids = new Set<string>()

        if (date !== undefined) {
          const cids = textsCidsByNatureAndDate[nature]?.[date]
          if (cids !== undefined) {
            foundCids =
              foundCids.size === 0
                ? new Set(cids)
                : foundCids.intersection(new Set(cids))
          }
        }

        if (num !== undefined) {
          const cids = textsCidsByNatureAndNum[nature]?.[num]
          if (cids !== undefined) {
            foundCids =
              foundCids.size === 0
                ? new Set(cids)
                : foundCids.intersection(new Set(cids))
          }
        }

        if (cid !== undefined) {
          const cids = Array.isArray(cid) ? cid : [cid]
          foundCids =
            foundCids.size === 0
              ? new Set(cids)
              : foundCids.intersection(
                  new Set(
                    cids.filter((cid) => textInfosByCid[cid].nature === nature),
                  ),
                )
        }

        const foundCid =
          foundCids.size === 1 ? foundCids.values().next().value : undefined
        const textInfos =
          foundCid === undefined ? undefined : textInfosByCid[foundCid]
        return Object.fromEntries(
          Object.entries({
            cid: foundCid,
            date,
            nature: nature ?? textInfos?.nature,
            num,
            title: textInfos?.title,
            type,
          }).filter(([, value]) => value !== undefined),
        )
      },
    },
  ),
  chain(
    [
      wordsTree(textCidByOtherTitleWordsTree as TextInfosByWordsTree),
      optional(espacePrecite, { default: "" }),
    ],
    {
      value: (results) => {
        const { cid } = results[0] as TextInfosByWordsTree
        const textInfos =
          typeof cid === "string" ? textInfosByCid[cid] : undefined

        return Object.fromEntries(
          Object.entries({
            cid,
            ...(textInfos ?? {}),
            type: "texte",
          }).filter(([, value]) => value !== undefined),
        )
      },
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
        ? { date: results[1] as string, num: results[0] as string }
        : { num: results[0] as string },
  }),
  convert(duDate, {
    value: (result) => ({ date: result as string }),
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
      type: "texte",
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
      ...(results[2] as TextAstTextIdentification),
      ...(results[0] as TextAstText),
    }),
  },
)

// Textes internationaux

export const texteInternational = regExp("convention", {
  flags: "i",
  value: {
    nature: "CONVENTION",
    legislation: "international",
    type: "texte",
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
            ...(results[2] as TextAstText),
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
      ...(results[1] as TextAstText),
      ...(results[0] ? { ofTheSaid: true } : {}),
      position: context.position(),
    }),
  },
)
