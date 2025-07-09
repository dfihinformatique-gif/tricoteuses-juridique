import {
  alternatives,
  chain,
  optional,
  regExp,
  synthesize,
  variable,
  type TextAst,
  type TextParserContext,
} from "./core.js"
import { espace, virgule, virguleOuEspace } from "./typography.js"

export const separateurEnumeration = alternatives(
  chain(
    espace,
    variable(
      "etOu",
      alternatives(regExp("et", { flags: "i" }), regExp("ou", { flags: "i" })),
    ),
    espace,
    synthesize(({ variables }) => variables.etOu),
  ),
  chain(
    virgule,
    optional(
      { default: "" },
      variable(
        "etOu",
        alternatives(
          regExp("et", { flags: "i" }),
          regExp("ou", { flags: "i" }),
        ),
      ),
      espace,
    ),
    synthesize(({ variables }) => variables.etOu ?? ","),
  ),
)

/**
 * Note: exclusion must be tested before enumeration (because of ",") and
 * before plage (because of "à").
 */
export const separateurExclusion = chain(
  virguleOuEspace,
  regExp("à l'exception ", { result: "sauf" }),
)

export function separateurPlage(
  context: TextParserContext,
): TextAst | undefined {
  const match = /^ à /i.exec(context.input)
  if (match === null) {
    return undefined
  }
  context.input = context.input.slice(match[0].length)
  return " à "
}
