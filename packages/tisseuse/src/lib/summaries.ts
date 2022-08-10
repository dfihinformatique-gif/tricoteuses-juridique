import type { Access, Summarizer, Summary } from "augmented-data-viewer"

import {
  type Article,
  assertNeverLegiObjectType,
  type LegiObject,
  type LegiObjectType,
  pathnameFromLegiObject,
  pathnameFromLegiObjectId,
  type Section,
  type Struct,
  type Version,
} from "$lib/data"

export const summarizeArticleProperties: Summarizer = (access, value) => {
  if (access?.key === "article") {
    return summarizeLegiObject(access, "article", value)
  }
  if (access?.access?.key === "articles") {
    return summarizeLegiObjectToLink(access, "article", value)
  }

  if (access?.key === "@id" && access?.access?.key === "LIEN_ART") {
    return {
      content: value as string,
      href: pathnameFromLegiObjectId("article", value as string),
      type: "link",
    }
  }
  if (access?.key === "CONTENU") {
    return { content: value as string, type: "html" }
  }
  if (access?.access?.key === "VERSION") {
    const version = value as Article["VERSIONS"]["VERSION"][0]
    const lienArt = version.LIEN_ART
    return {
      content: {
        items: [
          `Article ${lienArt["@num"]} en vigueur`,
          ...(lienArt["@fin"] === "2999-01-01"
            ? [
                " depuis le ",
                {
                  value: lienArt["@debut"],
                  type: "date",
                },
              ]
            : [
                " du ",
                {
                  value: lienArt["@debut"],
                  type: "date",
                },
                " au ",
                {
                  value: lienArt["@fin"],
                  type: "date",
                },
              ]),
        ],
        type: "concatenation",
      },
      href: pathnameFromLegiObjectId("article", lienArt["@id"]),
      type: "link",
    }
  }
  return undefined
}

export function summarizeLegiObject(
  access: Access | undefined,
  type: LegiObjectType,
  value: unknown,
): Summary | undefined {
  switch (type) {
    case "article": {
      const article = value as Article | undefined
      if (article === undefined) {
        return undefined
      }
      const metaArticle = article.META.META_SPEC.META_ARTICLE
      const titreTxt = article.CONTEXTE.TEXTE.TITRE_TXT
      const titreTexte = (Array.isArray(titreTxt) ? titreTxt[0] : titreTxt)[
        "#text"
      ]
      return {
        items: [
          `Article ${metaArticle.TYPE} ${metaArticle.ETAT} n° ${metaArticle.NUM}, en vigueur`,
          ...(metaArticle.DATE_FIN === "2999-01-01"
            ? [
                " depuis le ",
                {
                  value: metaArticle.DATE_DEBUT,
                  type: "date",
                },
              ]
            : [
                " du ",
                {
                  value: metaArticle.DATE_DEBUT,
                  type: "date",
                },
                " au ",
                {
                  value: metaArticle.DATE_FIN,
                  type: "date",
                },
              ]),
          " (",
          titreTexte,
          ")",
        ],
        type: "concatenation",
      }
    }
    case "eli_id":
      return `/eli/ids/TODO`
    case "eli_versions":
      return `/eli/ids/TODO`
    case "sections": {
      const section = value as Section | undefined
      return section?.ID
    }
    case "struct": {
      const struct = value as Struct | undefined
      return struct?.META.META_COMMUN.ID
    }
    case "version": {
      const version = value as Version | undefined
      return version?.META.META_COMMUN.ID
    }
    default:
      assertNeverLegiObjectType(type)
  }
}

export function summarizeLegiObjectToLink(
  access: Access | undefined,
  type: LegiObjectType,
  value: unknown,
): Summary | undefined {
  const objectSummary = summarizeLegiObject(access, type, value)
  return objectSummary === undefined
    ? undefined
    : {
        content: objectSummary,
        href: pathnameFromLegiObject(type, value as LegiObject),
        type: "link",
      }
}
