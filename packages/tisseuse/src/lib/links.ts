import { gitPathFromId, idRegExp, type IdType } from "@tricoteuses/legifrance"

import { assertNever } from "./asserts"

export type LinkType = (typeof linkTypes)[number]

export const linkTypes = ["Exploratrice", "Forgejo"] as const

export function urlFromLegalId(
  linkType: LinkType,
  baseUrl: string,
  id: string,
): string {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    throw new Error(`Unknown ID format: ${id}`)
  }
  switch (linkType) {
    case "Exploratrice": {
      const idType = idMatch[2] as IdType
      switch (idType) {
        case "ARTI": {
          return new URL(`legifrance/articles/${id}`, baseUrl).toString()
        }

        case "CONT": {
          return new URL(
            `legifrance/journaux_officiels/${id}`,
            baseUrl,
          ).toString()
        }

        case "SCTA": {
          return new URL(`legifrance/sections/${id}`, baseUrl).toString()
        }
        case "TEXT": {
          return new URL(`legifrance/textes/${id}`, baseUrl).toString()
        }

        default: {
          assertNever("urlFromLegalId Exploratrice idType", idType)
        }
      }

      // Never reached
      break
    }

    case "Forgejo": {
      return new URL(gitPathFromId(id, ".md"), baseUrl).toString()
    }

    default: {
      assertNever("urlFromLegalId linkType", linkType)
    }
  }
}
