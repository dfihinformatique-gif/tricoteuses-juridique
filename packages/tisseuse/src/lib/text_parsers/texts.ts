import {
  type EuropeanLawNature,
  type FrenchLawNature,
  type TextAstLocalization,
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
  (textTitlesInfos as { textCidByOtherTitleWordsTree?: TextInfosByWordsTree })
    .textCidByOtherTitleWordsTree ?? {}
const textCidByTitleRestWordsTree =
  (
    textTitlesInfos as unknown as {
      textCidByTitleRestWordsTree?: TextInfosByWordsTree
    }
  ).textCidByTitleRestWordsTree ?? {}
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
    regExp("Constitution", { value: "CONSTITUTION" }),
    regExp(
      "arrêtés?|circulaires?|code professionnel local|code|décret-loi|décrets?|livre(?= des procédures fiscales)|loi constitutionnelle|loi d'orientation quinquennale|loi d'orientation|loi de programme|loi locale|loi organique|loi quinquennale|loi|ordonnance (?:du Roi|locale|ministérielle|royale)|ordonnance",
      {
        flags: "i",
        value: (match) => {
          const text = match[0].toLowerCase()
          if (text.startsWith("arrêté")) return "ARRETE"
          if (text.startsWith("circulaire")) return "CIRCULAIRE"
          if (text === "code professionnel local") return "LOI"
          if (text === "code") return "CODE"
          if (text === "décret-loi") return "DECRET_LOI"
          if (text.startsWith("décret")) return "DECRET"
          if (text.startsWith("livre")) return "CODE"
          if (text === "loi constitutionnelle") return "LOI_CONSTIT"
          if (text === "loi d'orientation quinquennale") return "LOI"
          if (text === "loi d'orientation") return "LOI"
          if (text === "loi de programme") return "LOI"
          if (text === "loi locale") return "LOI"
          if (text === "loi organique") return "LOI_ORGANIQUE"
          if (text === "loi quinquennale") return "LOI"
          if (text === "loi") return "LOI"
          if (text.startsWith("ordonnance")) return "ORDONNANCE"
          return "LOI" // fallback
        },
      },
    ),
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
  [optional(numero, { default: null }), regExp(String.raw`\d+(-\d+)?`)],
  {
    value: (results) => results[1],
  },
)

export const numeroEtOuDateTexteFrancais = alternatives(
  duDate,
  chain([numeroTexteFrancais, optional(espaceDuDate, { default: null })], {
    value: (results) =>
      results[1] === null
        ? { num: results[0] as string }
        : {
            ...(results[1] as TextAstTextIdentification),
            num: results[0] as string,
          },
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

export const optionalEspaceDuTerritoire = optional(
  alternatives(
    regExp(" de la République française", { flags: "i" }),
    regExp(" du pays", { flags: "i" }),
  ),
  { default: null },
)

/**
 * Déclaration d’un (nom de) texte français
 *
 * Note: Ce parser suppose  que l'input finit avec le nom du texte
 *  et qu'elle ne contient rien d'autre après..
 * Note: Ce parser n'utilise pas wordsTree car il sert à le générer.
 */
export const definitionTexteFrancais = alternatives(
  chain(
    [
      natureTexteFrancais,
      optionalEspaceDuTerritoire,
      espace,
      numeroEtOuDateTexteFrancais,
      regExp(".*"),
    ],
    {
      value: (results) => {
        const text = {
          ...(results[0] as TextAstText),
          ...(results[3] as TextAstTextIdentification),
        } as TextAstText
        const titleRest = (results[4] as string).trim() || undefined
        if (titleRest !== undefined) {
          text.titleRest = titleRest
        }
        return text
      },
    },
  ),
  chain(
    [
      natureTexteFrancais,
      regExp("[^()]+"),
      regExp(String.raw`\( ?`),
      numeroEtOuDateTexteFrancais,
      regExp(String.raw` ?\)`),
    ],
    {
      value: (results) => {
        const text = {
          ...(results[0] as TextAstText),
          ...(results[3] as TextAstTextIdentification),
        } as TextAstText
        const titleRest = (results[1] as string).trim() || undefined
        if (titleRest !== undefined) {
          text.titleRest = titleRest
        }
        return text
      },
    },
  ),
  chain(
    [
      alternatives(
        regExp("code", { flags: "i", value: "CODE" }),
        regExp("livre(?= des procédures fiscales)", {
          flags: "i",
          value: "CODE",
        }),
      ),
      regExp(".+"),
    ],
    {
      value: (results) => {
        const text = {
          ...(results[0] as TextAstText),
        } as TextAstText
        const titleRest = (results[1] as string).trim() || undefined
        if (titleRest !== undefined) {
          text.titleRest = titleRest
        }
        return text
      },
    },
  ),
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
      optionalEspaceDuTerritoire,
      optional([espace, numeroEtOuDateTexteFrancais], {
        default: null,
        value: (results) => (results as [string, TextAstTextIdentification])[1],
      }),
      optional(
        [
          espace,
          convert(
            wordsTree(textCidByTitleRestWordsTree as TextInfosByWordsTree),
            {
              value: (result, context) => ({
                ...(result as TextAstTextInfos),
                titleRest: context.text(),
              }),
            },
          ),
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
          regExp(String.raw` ?\)`),
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
        const { date, num } = (results[2] ??
          results[4] ??
          {}) as TextAstTextIdentification
        const { cid, titleRest } = (results[3] ?? {}) as TextAstTextInfos & {
          titleRest?: string
        }
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
            titleRest,
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
  chain([numeroTexteEuropeen, optional(espaceDuDate, { default: null })], {
    value: (results) =>
      results[1] === null
        ? { num: results[0] as string }
        : {
            ...(results[1] as TextAstTextIdentification),
            num: results[0] as string,
          },
  }),
  duDate,
)

/**
 * Nature d’un texte européen, par exemple « règlement (UE) »
 */
export const natureTexteEuropeen = chain(
  [
    regExp(
      "arrêtés?|arrêts?|avis|décisions?|déclarations?|délibérations?|directive(?: d'exécution|déléguée)?|informations?|instructions?|lettres?|règlement(?: d'exécution)?",
      {
        flags: "i",
        value: (match) => {
          const text = match[0].toLowerCase()
          // "arrêté" must be before "arrêt".
          if (text.startsWith("arrêté")) return "ARRETEEURO"
          if (text.startsWith("arrêt")) return "ARRETEURO"
          if (text.startsWith("avis")) return "AVISEURO"
          if (text.startsWith("décision")) return "DECISION_EURO"
          if (text.startsWith("déclaration")) return "DECLARATIONEURO"
          if (text.startsWith("délibération")) return "DELIBERATIONEURO"
          if (text.startsWith("directive")) return "DIRECTIVE_EURO"
          if (text.startsWith("information")) return "INFORMATIONEURO"
          if (text.startsWith("instruction")) return "INSTRUCTIONEURO"
          if (text.startsWith("lettre")) return "LETTREEURO"
          if (text.startsWith("règlement")) return "REGLEMENTEUROPEEN"
          return "REGLEMENTEUROPEEN" // Fallback (should not happen)
        },
      },
    ),
    optional(
      regExp(String.raw` \((CE|CEE|EURATOM|UE(, EURATOM)?)\)`, { flags: "i" }),
      {
        default: "",
      },
    ),
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
            ...(results[0] === undefined
              ? {}
              : (results[0] as TextAstLocalization)),
          }),
        },
      ),
      texteFrancais,
      texteEuropeen,
      texteInternational,
    ),
  ],
  {
    value: (results, context) => {
      const text = {
        ...(results[1] as TextAstText),
        ...(results[0] ? { ofTheSaid: true } : {}),
        position: context.position(),
      }
      context.currentText = text
      return text
    },
  },
)
