import { type TextAst } from "./ast.js"
import {
  alternatives,
  chain,
  optional,
  regExp,
  TextParserContext,
  variable,
} from "./parsers.js"
import { espace, virgule, virguleOuEspace } from "./typography.js"

export const separateurEnumeration = alternatives(
  chain(
    [
      espace,
      variable(
        "etOu",
        alternatives(
          regExp("et", { flags: "i" }),
          regExp("ou", { flags: "i" }),
        ),
      ),
      espace,
    ],
    { value: (_, { variables }) => variables.etOu },
  ),
  chain(
    [
      virgule,
      optional(
        [
          variable(
            "etOu",
            alternatives(
              regExp("et", { flags: "i" }),
              regExp("ou", { flags: "i" }),
            ),
          ),
          espace,
        ],
        { default: "" },
      ),
    ],
    { value: (_, { variables }) => variables.etOu ?? "," },
  ),
)

/**
 * Note: exclusion must be tested before enumeration (because of ",") and
 * before plage (because of "à").
 */
export const separateurExclusion = chain([
  virguleOuEspace,
  regExp("à l'exception ", { value: "sauf" }),
])

export const separateurPlage = regExp(" à ", { flags: "i", value: "à" })
