import { TextAstAction, TextAstCitation } from "./ast.js"
import { citation } from "./citations.js"
import {
  alternatives,
  chain,
  fastPath,
  lookBehind,
  optional,
  regExp,
  repeat,
  type TextParser,
} from "./parsers.js"
import { espace, virguleOuEspace } from "./typography.js"

/**
 * Zero-width lookbehind parser that detects pre-reference action patterns.
 * Checks text immediately before the current offset for patterns like
 * "modalités d'application " or "conditions d'application de " indicating
 * a "précision" action (e.g. "un décret précise les modalités d'application
 * des articles [ref]").
 * Does NOT consume any input text.
 */
export const preAction: TextParser = alternatives(
  lookBehind(
    regExp("(modalités|conditions) d'application (de )?", { flags: "i" }),
    {
      lookbackLength: 35,
      value: { action: "précision" } as TextAstAction,
    },
  ),
  lookBehind(regExp("en application (de )?", { flags: "i" }), {
    lookbackLength: 35,
    value: { action: "application" } as TextAstAction,
  }),
)

export const action = fastPath(
  "après|avant|ajoutée?s?|insérée?s?|complétée?s?|rédigée?s?|suit|modifiée?s?|rétablie?s?|remplacée?s?|supprimée?s?|devient",
  alternatives(
    chain(
      [
        virguleOuEspace,
        regExp("est complété par les mots ?", { flags: "i" }),
        regExp(" ?:"),
        citation,
      ],
      {
        value: (results): TextAstAction => ({
          action: "compléter",
          actionInContent: true,
          originalCitations: [results[3] as TextAstCitation],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        regExp("(après|avant) (le mot|les mots) :", { flags: "i" }),
        citation,
        virguleOuEspace,
        alternatives(
          regExp("(il )?est ajoutée?", { flags: "i", value: "ajouter" }),
          regExp("sont ajoutée?s", { flags: "i", value: "ajouter" }),
          regExp("(il )?est insérée?", { flags: "i", value: "insérer" }),
          regExp("sont insérée?s", { flags: "i", value: "insérer" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[4] as TextAstAction["action"],
          actionInContent: true,
          originalCitations: [results[2] as TextAstCitation],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          chain(
            [
              optional(
                chain(
                  [
                    regExp("(après|avant) la référence :", { flags: "i" }),
                    citation,
                    virguleOuEspace,
                  ],
                  {
                    value: (results) => results[1] as TextAstCitation,
                  },
                ),
                { default: null },
              ),
              alternatives(
                regExp("(il )?est ajoutée?", { flags: "i", value: "ajouter" }),
                regExp("sont ajoutée?s", { flags: "i", value: "ajouter" }),
                regExp("(il )?est insérée?", { flags: "i", value: "insérer" }),
                regExp("sont insérée?s", { flags: "i", value: "insérer" }),
              ),
            ],
            {
              value: (results) => ({
                action: results[1] as TextAstAction["action"],
                originalCitation: results[0] as TextAstCitation | null,
              }),
            },
          ),
          regExp("(est|sont) complétée?s?", {
            flags: "i",
            value: { action: "compléter" as TextAstAction["action"] },
          }),
        ),
      ],
      {
        value: (results): TextAstAction => {
          const parsed = results[1] as {
            action: TextAstAction["action"]
            originalCitation?: TextAstCitation | null
          }
          const action: TextAstAction = {
            action: parsed.action,
          }
          if (parsed.originalCitation != null) {
            action.originalCitations = [parsed.originalCitation]
          }
          return action
        },
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("est ainsi rédigée?", { flags: "i" }),
          regExp("est rédigée? (ainsi qu'il|comme) suit", { flags: "i" }),
          regExp("sont ainsi rédigée?s", { flags: "i" }),
          regExp("sont rédigée?s (ainsi qu'il|comme) suit", { flags: "i" }),
        ),
      ],
      { value: { action: "rédiger" } },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("est ainsi modifiée?", { flags: "i", value: "modifier" }),
          regExp("est ainsi rétablie?", { flags: "i", value: "rétablir" }),
          regExp("est modifiée? (ainsi qu'il|comme) suit", {
            flags: "i",
            value: "modifier",
          }),
          regExp("est rétablie? (ainsi qu'il|comme) suit", {
            flags: "i",
            value: "rétablir",
          }),
          regExp("est remplacée?", { flags: "i", value: "remplacer" }),
          regExp("sont ainsi modifiée?s", { flags: "i", value: "modifier" }),
          regExp("sont ainsi rétablie?s", { flags: "i", value: "rétablir" }),
          regExp("sont modifiée?s (ainsi qu'il|comme) suit", {
            flags: "i",
            value: "modifier",
          }),
          regExp("sont rétablie?s (ainsi qu'il|comme) suit", {
            flags: "i",
            value: "rétablir",
          }),
          regExp("sont remplacée?s", { flags: "i", value: "remplacer" }),
          regExp("sont renum[eé]rotée?s", {
            flags: "i",
            value: "renuméroter",
          }),
          regExp("devien(nen)?t", { flags: "i", value: "devenir" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[1] as TextAstAction["action"],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          chain(
            [
              alternatives(
                regExp("l'année", { flags: "i" }),
                regExp("la (date|mention|référence)", { flags: "i" }),
                regExp("le (montant|mot|taux)", { flags: "i" }),
                regExp("le tableau intitulé", { flags: "i" }),
                regExp("les mots", { flags: "i" }),
              ),
              regExp(" ?:"),
              citation,
              espace,
              alternatives(
                regExp("est ainsi modifiée?", {
                  flags: "i",
                  value: "modifier",
                }),
                regExp("est remplacée?", { flags: "i", value: "remplacer" }),
                regExp("sont remplacée?s", { flags: "i", value: "remplacer" }),
                regExp("est modifiée?", { flags: "i", value: "modifier" }),
                regExp("sont modifiée?s", { flags: "i", value: "modifier" }),
              ),
            ],
            {
              value: (results) => ({
                action: results[4] as TextAstAction["action"],
                citations: [results[2] as TextAstCitation],
              }),
            },
          ),
          chain(
            [
              regExp("les nombres", { flags: "i" }),
              regExp(" ?:"),
              repeat(citation, {
                min: 1,
                separator: regExp("(,| et)", { flags: "i" }),
                value: (
                  results,
                ): Array<TextAstCitation | [string, TextAstCitation]> =>
                  results.map((result) =>
                    Array.isArray(result) ? result[1] : result,
                  ) as TextAstCitation[],
              }),
              espace,
              regExp("sont respectivement remplacés", {
                flags: "i",
                value: "remplacer",
              }),
            ],
            {
              value: (results) => ({
                action: results[4] as TextAstAction["action"],
                citations: results[2] as TextAstCitation[],
              }),
            },
          ),
        ),
      ],
      {
        value: (results): TextAstAction => {
          const parsed = results[1] as {
            action: TextAstAction["action"]
            citations: TextAstCitation[]
          }
          return {
            action: parsed.action,
            actionInContent: true,
            originalCitations: parsed.citations,
          }
        },
      },
    ),
    chain(
      [
        virguleOuEspace,
        citation,
        optional([virguleOuEspace], { default: "" }),
        alternatives(
          regExp("est remplacée?", { flags: "i", value: "remplacer" }),
          regExp("sont remplacée?s", { flags: "i", value: "remplacer" }),
          regExp("est modifiée?", { flags: "i", value: "modifier" }),
          regExp("sont modifiée?s", { flags: "i", value: "modifier" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[3] as TextAstAction["action"],
          actionInContent: true,
          originalCitations: [results[1] as TextAstCitation],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        regExp("le montant (de|d') [^,;:.]{1,60}?(?= est )", { flags: "i" }),
        espace,
        alternatives(
          regExp("est remplacée?", { flags: "i", value: "remplacer" }),
          regExp("est modifiée?", { flags: "i", value: "modifier" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[3] as TextAstAction["action"],
          actionInContent: true,
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        citation,
        optional([virguleOuEspace], { default: "" }),
        alternatives(
          regExp("sont (ajouté|inséré)e?s les mots", { flags: "i" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: "ajouter",
          actionInContent: true,
          originalCitations: [results[1] as TextAstCitation],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        citation,
        optional([virguleOuEspace], { default: "" }),
        regExp("(il )?est inséré(e|s)? la référence", { flags: "i" }),
      ],
      {
        value: {
          action: "insérer",
          actionInContent: true,
        },
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("sont ajoutés", { flags: "i", value: "ajouter" }),
          regExp("est ajouté", { flags: "i", value: "ajouter" }),
          regExp("est rétabli", { flags: "i", value: "rétablir" }),
          regExp("sont rétablis", { flags: "i", value: "rétablir" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[1] as TextAstAction["action"],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        citation,
        optional([virguleOuEspace], { default: "" }),
        alternatives(
          regExp("est supprimée?", { flags: "i" }),
          regExp("sont supprimée?s", { flags: "i" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: "supprimer",
          actionInContent: true,
          originalCitations: [results[1] as TextAstCitation],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("est supprimée la (mention|référence)", {
            flags: "i",
            value: () =>
              ({
                action: "supprimer",
                citation: null,
              }) as {
                action: TextAstAction["action"]
                citation: TextAstCitation | null
              },
          }),
          chain(
            [
              regExp("la (mention|référence)", { flags: "i" }),
              regExp(" ?:"),
              citation,
              espace,
              regExp("est supprimée", { flags: "i" }),
            ],
            {
              value: (results) =>
                ({
                  action: "supprimer",
                  citation: results[2] as TextAstCitation,
                }) as {
                  action: TextAstAction["action"]
                  citation: TextAstCitation | null
                },
            },
          ),
          chain(
            [
              regExp("les mots", { flags: "i" }),
              regExp(" ?:"),
              citation,
              espace,
              regExp("sont supprimés", { flags: "i" }),
            ],
            {
              value: (results) =>
                ({
                  action: "supprimer",
                  citation: results[2] as TextAstCitation,
                }) as {
                  action: TextAstAction["action"]
                  citation: TextAstCitation | null
                },
            },
          ),
          chain(
            [
              regExp("les références", { flags: "i" }),
              regExp(" ?:"),
              citation,
              espace,
              regExp("sont supprimées", { flags: "i" }),
            ],
            {
              value: (results) =>
                ({
                  action: "supprimer",
                  citation: results[2] as TextAstCitation,
                }) as {
                  action: TextAstAction["action"]
                  citation: TextAstCitation | null
                },
            },
          ),
        ),
      ],

      {
        value: (results): TextAstAction => {
          const parsed = results[1] as {
            action: TextAstAction["action"]
            citation: TextAstCitation | null
          }
          const action: TextAstAction = {
            action: parsed.action,
            actionInContent: true,
          }
          if (parsed.citation != null) {
            action.originalCitations = [parsed.citation]
          }
          return action
        },
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("sont abrogée?s", { flags: "i", value: "abroger" }),
          regExp("sont supprimée?s", { flags: "i", value: "supprimer" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[1] as TextAstAction["action"],
        }),
      },
    ),
    chain(
      [
        virguleOuEspace,
        alternatives(
          regExp("est abrogée?", { flags: "i", value: "abroger" }),
          regExp("est supprimée?", { flags: "i", value: "supprimer" }),
        ),
      ],
      {
        value: (results): TextAstAction => ({
          action: results[1] as TextAstAction["action"],
        }),
      },
    ),
  ),
)
