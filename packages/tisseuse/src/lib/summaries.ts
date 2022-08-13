import arrowRight from "@iconify-icons/codicon/arrow-small-right"
import type { Access, Summarizer, Summary } from "augmented-data-viewer"

import {
  type Article,
  assertNeverLegalObjectType,
  bestItemForDate,
  type Idcc,
  type IdWrapper,
  type Jo,
  type LegalObject,
  type LegalObjectType,
  pathnameFromLegalObject,
  pathnameFromLegalObjectId,
  type SectionTa,
  type Textekali,
  type Textelr,
  type TexteVersion,
  type LienArt,
  type VersionsWrapper,
  type DossierLegislatif,
} from "$lib/data"

export const summarizeArticleProperties: Summarizer = (access, value) => {
  if (access?.key === "article" && typeof value !== "number") {
    return summarizeLegalObject(access, "article", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "article") {
    return summarizeLegalObjectToLink(access, "article", value)
  }

  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_ART" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_ART"))
  ) {
    return summarizeLienArtId(access.access, access.parent)
  }
  if (access?.key === "CONTENU") {
    return { content: value as string, type: "html" }
  }
  if (access?.key === "LIEN_ART" && !Array.isArray(value)) {
    return summarizeLienArt(access, value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "LIEN_ART") {
    return summarizeLienArt(access, value)
  }
  if (access?.access?.key === "VERSION") {
    const version = value as Article["VERSIONS"]["VERSION"][0]
    const lienArt = version.LIEN_ART
    return {
      content: {
        items: [
          `Article ${lienArt["@num"]} en vigueur`,
          ...(lienArt["@fin"] === "2999-01-01"
            ? ([
                " depuis le ",
                {
                  value: lienArt["@debut"],
                  type: "date",
                },
              ] as Summary[])
            : ([
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
              ] as Summary[])),
        ],
        type: "concatenation",
      },
      href: pathnameFromLegalObjectId("article", lienArt["@id"]),
      type: "link",
    }
  }
  return undefined
}

export const summarizeDossierLegislatifProperties: Summarizer = (
  access,
  value,
) => {
  if (access?.key === "dossier_legislatif" && typeof value !== "number") {
    return summarizeLegalObject(access, "dossier_legislatif", value)
  }
  if (
    typeof access?.key === "number" &&
    access?.access?.key === "dossier_legislatif"
  ) {
    return summarizeLegalObjectToLink(access, "dossier_legislatif", value)
  }

  if (access?.key === "CONTENU_DOSSIER_1") {
    return { content: value as string, type: "html" }
  }
  if (access?.key === "CONTENU_DOSSIER_2") {
    return { content: value as string, type: "html" }
  }
  if (access?.key === "EXPOSE_MOTIF") {
    return { content: value as string, type: "html" }
  }
  return undefined
}

export const summarizeIdccProperties: Summarizer = (access, value) => {
  if (access?.key === "idcc" && typeof value !== "number") {
    return summarizeLegalObject(access, "idcc", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "idcc") {
    return summarizeLegalObjectToLink(access, "idcc", value)
  }

  return undefined
}

export const summarizeIdWrapperProperties: Summarizer = (access, value) => {
  if (access?.key === "id" && typeof value !== "number") {
    return summarizeLegalObject(access, "id", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "id") {
    return summarizeLegalObjectToLink(access, "id", value)
  }

  return undefined
}

export const summarizeJoProperties: Summarizer = (access, value) => {
  if (access?.key === "jo" && typeof value !== "number") {
    return summarizeLegalObject(access, "jo", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "jo") {
    return summarizeLegalObjectToLink(access, "jo", value)
  }

  return undefined
}

export function summarizeLegalObject(
  access: Access | undefined,
  type: LegalObjectType,
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
            ? ([
                " depuis le ",
                {
                  value: metaArticle.DATE_DEBUT,
                  type: "date",
                },
              ] as Summary[])
            : ([
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
              ] as Summary[])),
          " (",
          titreTexte,
          ")",
        ],
        type: "concatenation",
      }
    }
    case "dossier_legislatif": {
      const dossierLegislatif = value as DossierLegislatif | undefined
      return dossierLegislatif?.META.META_DOSSIER_LEGISLATIF.TITRE
    }
    case "id":
      const idWrapper = value as IdWrapper | undefined
      return idWrapper?.eli
    case "idcc": {
      const idcc = value as Idcc | undefined
      return idcc?.META.META_SPEC.META_CONTENEUR.TITRE
    }
    case "jo": {
      const jo = value as Jo | undefined
      return jo?.META.META_SPEC.META_CONTENEUR.TITRE
    }
    case "section_ta": {
      const sectionTa = value as SectionTa | undefined
      if (sectionTa === undefined) {
        return undefined
      }
      const today = new Date().toISOString().split("T")[0]
      return `${sectionTa.TITRE_TA} — ${
        bestItemForDate(sectionTa.CONTEXTE.TEXTE.TITRE_TXT, today)?.["#text"]
      }`
    }
    case "texte_version": {
      const texteVersion = value as TexteVersion | undefined
      return texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL
    }
    case "textekali": {
      const textekali = value as Textekali | undefined
      return textekali?.META.META_COMMUN.ID
    }
    case "textelr": {
      const textelr = value as Textelr | undefined
      return textelr?.META.META_COMMUN.ID
    }
    case "versions":
      const versionsWrapper = value as VersionsWrapper | undefined
      return versionsWrapper?.eli
    default:
      assertNeverLegalObjectType(type)
  }
}

export function summarizeLegalObjectToLink(
  access: Access | undefined,
  type: LegalObjectType,
  value: unknown,
): Summary | undefined {
  const objectSummary = summarizeLegalObject(access, type, value)
  return objectSummary === undefined
    ? undefined
    : {
        content: objectSummary,
        href: pathnameFromLegalObject(type, value as LegalObject),
        type: "link",
      }
}

export const summarizeLienArt: Summarizer = (access, value) => {
  const lienArt = value as LienArt | undefined
  if (lienArt === undefined) {
    return undefined
  }
  return {
    content: `Article n° ${lienArt["@num"]}`,
    href: pathnameFromLegalObjectId("article", lienArt["@id"]),
    type: "link",
  }
}

export const summarizeLienArtId: Summarizer = (access, value) => {
  const lienArt = value as LienArt | undefined
  if (lienArt === undefined) {
    return undefined
  }
  return {
    items: [
      {
        content: JSON.stringify(lienArt["@id"]),
        type: "raw_data",
      },
      { class: "mx-1", icon: arrowRight, inline: true, type: "icon" },
      summarizeLienArt(access, lienArt)!,
    ],
    type: "concatenation",
  }
}

export const summarizeSectionTaProperties: Summarizer = (access, value) => {
  if (access?.key === "section_ta" && typeof value !== "number") {
    return summarizeLegalObject(access, "section_ta", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "section_ta") {
    return summarizeLegalObjectToLink(access, "section_ta", value)
  }

  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_ART" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_ART"))
  ) {
    return summarizeLienArtId(access.access, access.parent)
  }
  if (access?.key === "LIEN_ART" && !Array.isArray(value)) {
    return summarizeLienArt(access, value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "LIEN_ART") {
    return summarizeLienArt(access, value)
  }
  return undefined
}

export const summarizeTextekaliProperties: Summarizer = (access, value) => {
  if (access?.key === "textekali" && typeof value !== "number") {
    return summarizeLegalObject(access, "textekali", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "textekali") {
    return summarizeLegalObjectToLink(access, "textekali", value)
  }

  return undefined
}

export const summarizeTextelrProperties: Summarizer = (access, value) => {
  if (access?.key === "textelr" && typeof value !== "number") {
    return summarizeLegalObject(access, "textelr", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "textelr") {
    return summarizeLegalObjectToLink(access, "textelr", value)
  }

  return undefined
}

export const summarizeTexteVersionProperties: Summarizer = (access, value) => {
  if (access?.key === "texte_version" && typeof value !== "number") {
    return summarizeLegalObject(access, "texte_version", value)
  }
  if (
    typeof access?.key === "number" &&
    access?.access?.key === "texte_version"
  ) {
    return summarizeLegalObjectToLink(access, "texte_version", value)
  }

  return undefined
}

export const summarizeVersionsWrapperProperties: Summarizer = (
  access,
  value,
) => {
  if (access?.key === "versions" && typeof value !== "number") {
    return summarizeLegalObject(access, "versions", value)
  }
  if (typeof access?.key === "number" && access?.access?.key === "versions") {
    return summarizeLegalObjectToLink(access, "versions", value)
  }

  return undefined
}
