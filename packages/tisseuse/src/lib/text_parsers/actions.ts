import { TextAstAction, TextAstCitation } from "./ast.js"
import { citation } from "./citations.js"
import { alternatives, chain, optional, regExp, repeat } from "./parsers.js"
import { espace, virguleOuEspace } from "./typography.js"

export const action = alternatives(
  // After/Before specific words already quoted.
  chain(
    [
      virguleOuEspace,
      regExp("(après|avant) (le mot|les mots) :", { flags: "i" }),
      citation,
      virguleOuEspace,
      alternatives(
        regExp("(il )?est (ajouté|inséré)e?", { flags: "i" }),
        regExp("sont (ajouté|inséré)e?s", { flags: "i" }),
      ),
    ],
    {
      value: (results): TextAstAction => ({
        action: "CREATION",
        actionInContent: true,
        originalCitations: [results[2] as TextAstCitation],
      }),
    },
  ),
  // "..., « ... », sont insérés les mots ..."
  chain(
    [
      virguleOuEspace,
      citation,
      optional([virguleOuEspace], { default: "" }),
      regExp("sont (ajouté|inséré)e?s les mots", { flags: "i" }),
    ],
    {
      value: (results): TextAstAction => ({
        action: "CREATION",
        actionInContent: true,
        originalCitations: [results[1] as TextAstCitation],
      }),
    },
  ),
  // "..., « ... », il est inséré la référence"
  chain(
    [
      virguleOuEspace,
      citation,
      optional([virguleOuEspace], { default: "" }),
      regExp("(il )?est inséré(e|s)? la référence", { flags: "i" }),
    ],
    { value: { action: "CREATION", actionInContent: true } },
  ),
  // "... est complété par les mots : « ... »"
  chain(
    [
      virguleOuEspace,
      alternatives(
        regExp("est complétée? par les mots", { flags: "i" }),
        regExp("sont complétée?s par les mots", { flags: "i" }),
      ),
      regExp(" ?:"),
      citation,
    ],
    {
      value: (results): TextAstAction => ({
        action: "CREATION",
        actionInContent: true,
        originalCitations: [results[3] as TextAstCitation],
      }),
    },
  ),
  // General creations (insert/add/restore/complete), optionally after a cited reference.
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
              regExp("(il )?est (ajouté|inséré)e?", { flags: "i" }),
              regExp("sont (ajouté|inséré)e?s", { flags: "i" }),
              regExp("(il )?est rétablie?", { flags: "i" }),
              regExp("sont rétablie?s", { flags: "i" }),
              regExp("est complétée?", { flags: "i" }),
              regExp("sont complétée?s", { flags: "i" }),
            ),
          ],
          {
            value: (results) => results[0] as TextAstCitation | null,
          },
        ),
      ),
    ],
    {
      value: (results): TextAstAction => {
        const action: TextAstAction = {
          action: "CREATION",
        }
        const originalCitation = results[1] as TextAstCitation | null
        if (originalCitation != null) {
          action.originalCitations = [originalCitation]
        }
        return action
      },
    },
  ),
  // Creation or modification: "est ainsi rédigé" / "est rédigé comme suit".
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
    { value: { action: "CREATION_OU_MODIFICATION" } },
  ),
  // Direct modification patterns.
  chain(
    [
      virguleOuEspace,
      alternatives(
        regExp("est ainsi (modifié|rétabli)e?", { flags: "i" }),
        regExp("est (modifié|rétabli)e? (ainsi qu'il|comme) suit", {
          flags: "i",
        }),
        regExp("est remplacée?", { flags: "i" }),
        regExp("sont ainsi (modifié|rétabli)e?s", { flags: "i" }),
        regExp("sont (modifié|rétabli)e?s (ainsi qu'il|comme) suit", {
          flags: "i",
        }),
        regExp("sont remplacée?s", { flags: "i" }),
        regExp("devient", { flags: "i" }),
        regExp("deviennent", { flags: "i" }),
        regExp("est renum[eé]rotée?", { flags: "i" }),
        regExp("sont renum[eé]rotée?s", { flags: "i" }),
      ),
    ],
    { value: { action: "MODIFICATION" } },
  ),
  // Modification with cited content after a label.
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
              regExp("est ainsi modifiée?", { flags: "i" }),
              regExp("est remplacée?", { flags: "i" }),
              regExp("sont remplacée?s", { flags: "i" }),
            ),
          ],
          {
            value: (results): TextAstCitation[] => [
              results[2] as TextAstCitation,
            ],
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
            regExp("sont respectivement remplacés", { flags: "i" }),
          ],
          {
            value: (results) => results[2] as TextAstCitation[],
          },
        ),
      ),
    ],
    {
      value: (results): TextAstAction => ({
        action: "MODIFICATION",
        actionInContent: true,
        originalCitations: results[1] as TextAstCitation[],
      }),
    },
  ),
  // Modification with inline quoted content.
  chain(
    [
      virguleOuEspace,
      citation,
      optional([virguleOuEspace], { default: "" }),
      alternatives(
        regExp("est remplacée?", { flags: "i" }),
        regExp("sont remplacée?s", { flags: "i" }),
        regExp("est modifiée?", { flags: "i" }),
        regExp("sont modifiée?s", { flags: "i" }),
      ),
    ],
    {
      value: (results): TextAstAction => ({
        action: "MODIFICATION",
        actionInContent: true,
        originalCitations: [results[1] as TextAstCitation],
      }),
    },
  ),
  // Modification for amounts without quotes (kept narrow to avoid false positives).
  chain(
    [
      virguleOuEspace,
      regExp("le montant (de|d') [^,;:.]{1,60}?(?= est )", { flags: "i" }),
      espace,
      alternatives(
        regExp("est remplacée?", { flags: "i" }),
        regExp("est modifiée?", { flags: "i" }),
      ),
    ],
    { value: { action: "MODIFICATION", actionInContent: true } },
  ),
  // Suppression with inline quoted content.
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
        action: "SUPPRESSION",
        actionInContent: true,
        originalCitations: [results[1] as TextAstCitation],
      }),
    },
  ),
  // Suppression with labeled content.
  chain(
    [
      virguleOuEspace,
      alternatives(
        regExp("est supprimée la (mention|référence)", {
          flags: "i",
          value: null,
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
            value: (results) => results[2] as TextAstCitation,
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
            value: (results) => results[2] as TextAstCitation,
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
            value: (results) => results[2] as TextAstCitation,
          },
        ),
      ),
    ],

    {
      value: (results): TextAstAction => {
        const action: TextAstAction = {
          action: "SUPPRESSION",
          actionInContent: true,
        }
        if (results[1] != null) {
          action.originalCitations = [results[1] as TextAstCitation]
        }
        return action
      },
    },
  ),
  // Generic suppression / abrogation.
  chain(
    [virguleOuEspace, regExp("sont (abrogé|supprimé)e?s", { flags: "i" })],
    { value: { action: "SUPPRESSION" } },
  ),
  chain([virguleOuEspace, regExp("est (abrogé|supprimé)e?", { flags: "i" })], {
    value: { action: "SUPPRESSION" },
  }),
)
