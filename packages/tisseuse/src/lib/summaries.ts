import arrowRight from "@iconify-icons/codicon/arrow-small-right"
import type { Access, Summarizer, Summary } from "augmented-data-viewer"

import {
  type Article,
  type ArticleVersion,
  assertNeverLegalObjectType,
  bestItemForDate,
  type DossierLegislatif,
  type Idcc,
  type IdWrapper,
  type Jo,
  type LegalObject,
  type LegalObjectType,
  type Lien,
  type LienArt,
  type LienSectionTa,
  pathnameFromLegalId,
  pathnameFromLegalObject,
  pathnameFromLegalObjectTypeAndId,
  type SectionTa,
  type Textekali,
  type Textelr,
  type TextelrVersionLienTxt,
  type TexteVersion,
  type TitreTxt,
  type TitreTm,
  type Tm,
  type TmLienTxt,
  type VersionsWrapper,
} from "$lib/legal"

export const summarizeAggregateProperties: Summarizer = (access, value) => {
  for (const summarizer of [
    summarizeArticleProperties,
    summarizeDossierLegislatifProperties,
    summarizeIdccProperties,
    summarizeJoProperties,
    summarizeSectionTaProperties,
    summarizeTextekaliProperties,
    summarizeTextelrProperties,
    summarizeTexteVersionProperties,
  ]) {
    const summary = summarizer(access, value)
    if (summary !== undefined) {
      return summary
    }
  }
  return undefined
}

export const summarizeArticleProperties: Summarizer = (access, value) => {
  if (
    access?.key === "article" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of article by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "article", value)
  }
  if (
    access?.access?.key === "article" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "article", value)
  }

  if (access?.key === "@cid" && access?.access?.key === "TEXTE") {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    access?.key === "@cidtexte" &&
    (access?.access?.key === "LIEN" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN"))
  ) {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN"))
  ) {
    return summarizeLienId(access.access, access.parent)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_ART" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_ART"))
  ) {
    return summarizeLienArtId(access.access, access.parent)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "TITRE_TM" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "TITRE_TM"))
  ) {
    return summarizeTitreTmId(access.access, access.parent)
  }
  if (
    access?.key === "@id_txt" &&
    (access?.access?.key === "TITRE_TXT" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "TITRE_TXT"))
  ) {
    return summarizeTitreTxtIdTxt(access.access, access.parent)
  }
  if (access?.key === "CONTENU") {
    return { content: value as string, type: "html" }
  }
  if (
    (access?.key === "LIEN" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "LIEN")
  ) {
    return summarizeLien(access, value)
  }
  if (
    (access?.key === "LIEN_ART" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "LIEN_ART")
  ) {
    return summarizeLienArt(access, value)
  }
  if (
    (access?.key === "VERSION" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "VERSION")
  ) {
    const version = value as ArticleVersion
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
      href: pathnameFromLegalObjectTypeAndId("article", lienArt["@id"]),
      type: "link",
    }
  }
  return undefined
}

export const summarizeDossierLegislatifProperties: Summarizer = (
  access,
  value,
) => {
  if (
    access?.key === "dossier_legislatif" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of dossier_legislatif by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "dossier_legislatif", value)
  }
  if (
    access?.access?.key === "dossier_legislatif" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
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
  if (
    access?.key === "idcc" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of idcc by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "idcc", value)
  }
  if (
    access?.access?.key === "idcc" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "idcc", value)
  }

  return undefined
}

export const summarizeIdWrapperProperties: Summarizer = (access, value) => {
  if (
    access?.key === "id" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of id by eli.
      Object.keys(value as { [key: string]: unknown }).some(
        // TODO: Fix regexp.
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "id", value)
  }
  if (
    access?.access?.key === "id" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "id", value)
  }

  return undefined
}

export const summarizeJoProperties: Summarizer = (access, value) => {
  if (
    access?.key === "jo" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of jo by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "jo", value)
  }
  if (
    access?.access?.key === "jo" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "jo", value)
  }

  if (
    (access?.key === "LIEN_TXT" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "LIEN_TXT")
  ) {
    return summarizeTmLienTxt(access, value)
  }
  if (
    (access?.key === "TM" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "TM")
  ) {
    return summarizeTm(access, value)
  }

  return undefined
}

export function summarizeLegalIdToLink(
  access: Access | undefined,
  value: unknown,
): Summary | undefined {
  const id = value as string | undefined
  if (id === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(id)
  if (pathname === undefined) {
    return undefined
  }
  return {
    content: id,
    href: pathname,
    type: "link",
  }
}

export function summarizeLegalIdToValueArrowLink(
  access: Access | undefined,
  value: unknown,
): Summary | undefined {
  const uidLinkSummary = summarizeLegalIdToLink(access, value)
  return uidLinkSummary === undefined
    ? undefined
    : {
        items: [
          {
            content: JSON.stringify(value),
            type: "raw_data",
          },
          { class: "mx-1 mt-1", icon: arrowRight, inline: true, type: "icon" },
          uidLinkSummary,
        ],
        type: "concatenation",
      }
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
      const titreTexte = (Array.isArray(titreTxt) ? titreTxt[0] : titreTxt)?.[
        "#text"
      ]
      return {
        items: [
          `Article ${metaArticle.NUM} ${metaArticle.TYPE} ${metaArticle.ETAT}, en vigueur`,
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
          ...(titreTexte === undefined ? [] : [" (", titreTexte, ")"]),
        ],
        type: "concatenation",
      }
    }
    case "dossier_legislatif": {
      const dossierLegislatif = value as DossierLegislatif | undefined
      return dossierLegislatif?.META.META_DOSSIER_LEGISLATIF.TITRE
    }
    case "id": {
      const idWrapper = value as IdWrapper | undefined
      return idWrapper?.eli
    }
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
      return (
        texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
        texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITRE
      )
    }
    case "textekali": {
      const textekali = value as Textekali | undefined
      return textekali?.META.META_COMMUN.ID
    }
    case "textelr": {
      const textelr = value as Textelr | undefined
      return textelr?.META.META_COMMUN.ID
    }
    case "versions": {
      const versionsWrapper = value as VersionsWrapper | undefined
      return versionsWrapper?.eli
    }
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

export const summarizeLien: Summarizer = (access, value) => {
  const lien = value as Lien | undefined
  if (lien === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(lien["@id"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    content: `${lien["@typelien"]} ${lien["@sens"]} : ${lien["#text"]}`,
    href: pathname,
    type: "link",
  }
}

export const summarizeLienArt: Summarizer = (access, value) => {
  const lienArt = value as LienArt | undefined
  if (lienArt === undefined) {
    return undefined
  }
  return {
    content: `Article ${lienArt["@num"]}`,
    href: pathnameFromLegalObjectTypeAndId("article", lienArt["@id"]),
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
      { class: "mt-1 mx-1", icon: arrowRight, inline: true, type: "icon" },
      summarizeLienArt(access, lienArt) as Summary,
    ],
    type: "concatenation",
  }
}

export const summarizeLienId: Summarizer = (access, value) => {
  const lien = value as Lien | undefined
  if (lien === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(lien["@id"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    items: [
      {
        content: JSON.stringify(lien["@id"]),
        type: "raw_data",
      },
      { class: "mt-1 mx-1", icon: arrowRight, inline: true, type: "icon" },
      {
        content: lien["#text"],
        href: pathname,
        type: "link",
      },
    ],
    type: "concatenation",
  }
}

export const summarizeLienSectionTa: Summarizer = (access, value) => {
  const lienSectionTa = value as LienSectionTa | undefined
  if (lienSectionTa === undefined) {
    return undefined
  }
  return {
    content: lienSectionTa["#text"],
    href: pathnameFromLegalObjectTypeAndId("section_ta", lienSectionTa["@id"]),
    type: "link",
  }
}

export const summarizeLienSectionTaId: Summarizer = (access, value) => {
  const lienSectionTa = value as LienSectionTa | undefined
  if (lienSectionTa === undefined) {
    return undefined
  }
  return {
    items: [
      {
        content: JSON.stringify(lienSectionTa["@id"]),
        type: "raw_data",
      },
      { class: "mt-1 mx-1", icon: arrowRight, inline: true, type: "icon" },
      summarizeLienSectionTa(access, lienSectionTa) as Summary,
    ],
    type: "concatenation",
  }
}

export const summarizeSectionTaProperties: Summarizer = (access, value) => {
  if (
    access?.key === "section_ta" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of section_ta by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "section_ta", value)
  }
  if (
    access?.access?.key === "section_ta" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "section_ta", value)
  }

  if (access?.key === "@cid" && access?.access?.key === "TEXTE") {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    access?.key === "@cid" &&
    (access?.access?.key === "LIEN_SECTION_TA" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_SECTION_TA"))
  ) {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_ART" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_ART"))
  ) {
    return summarizeLienArtId(access.access, access.parent)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_SECTION_TA" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_SECTION_TA"))
  ) {
    return summarizeLienSectionTaId(access.access, access.parent)
  }
  if (
    (access?.key === "LIEN_ART" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "LIEN_ART")
  ) {
    return summarizeLienArt(access, value)
  }
  if (
    (access?.key === "LIEN_SECTION_TA" && !Array.isArray(value)) ||
    (typeof access?.key === "number" &&
      access?.access?.key === "LIEN_SECTION_TA")
  ) {
    return summarizeLienSectionTa(access, value)
  }
  return undefined
}

export const summarizeTextekaliProperties: Summarizer = (access, value) => {
  if (
    access?.key === "textekali" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of textekali by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "textekali", value)
  }
  if (
    access?.access?.key === "textekali" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "textekali", value)
  }

  if (access?.key === "CID") {
    return summarizeLegalIdToLink(access, value)
  }

  return undefined
}

export const summarizeTextelrVersionLienTxt: Summarizer = (access, value) => {
  const lienTxt = value as TextelrVersionLienTxt | undefined
  if (lienTxt === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(lienTxt["@id"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    content: lienTxt["@id"],
    href: pathname,
    type: "link",
  }
}

export const summarizeTextelrProperties: Summarizer = (access, value) => {
  if (
    access?.key === "textelr" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of textelr by id.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "textelr", value)
  }
  if (
    access?.access?.key === "textelr" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "textelr", value)
  }

  if (
    access?.key === "@cid" &&
    (access?.access?.key === "LIEN_SECTION_TA" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_SECTION_TA"))
  ) {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_ART" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_ART"))
  ) {
    return summarizeLienArtId(access.access, access.parent)
  }
  if (
    access?.key === "@id" &&
    (access?.access?.key === "LIEN_SECTION_TA" ||
      (typeof access?.access?.key === "number" &&
        access?.access?.access?.key === "LIEN_SECTION_TA"))
  ) {
    return summarizeLienSectionTaId(access.access, access.parent)
  }
  if (access?.key === "CID") {
    return summarizeLegalIdToLink(access, value)
  }
  if (
    (access?.key === "LIEN_ART" && !Array.isArray(value)) ||
    (typeof access?.key === "number" && access?.access?.key === "LIEN_ART")
  ) {
    return summarizeLienArt(access, value)
  }
  if (
    (access?.key === "LIEN_SECTION_TA" && !Array.isArray(value)) ||
    (typeof access?.key === "number" &&
      access?.access?.key === "LIEN_SECTION_TA")
  ) {
    return summarizeLienSectionTa(access, value)
  }
  if (access?.key === "LIEN_TXT") {
    return summarizeTextelrVersionLienTxt(access, value)
  }

  return undefined
}

export const summarizeTexteVersionProperties: Summarizer = (access, value) => {
  if (
    access?.key === "texte_version" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of texte_version by id.
      Object.keys(value as { [key: string]: unknown }).some(
        // TODO: Fix regexp.
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "texte_version", value)
  }
  if (
    access?.access?.key === "texte_version" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "texte_version", value)
  }

  if (access?.key === "CID") {
    return summarizeLegalIdToLink(access, value)
  }
  if (access?.key === "CONTENU") {
    return { content: value as string, type: "html" }
  }

  return undefined
}

export const summarizeTitreTmId: Summarizer = (access, value) => {
  const titreTm = value as TitreTm | undefined
  if (titreTm === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(titreTm["@id"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    items: [
      {
        content: JSON.stringify(titreTm["@id"]),
        type: "raw_data",
      },
      { class: "mt-1 mx-1", icon: arrowRight, inline: true, type: "icon" },
      {
        content: titreTm["#text"],
        href: pathname,
        type: "link",
      },
    ],
    type: "concatenation",
  }
}

export const summarizeTitreTxtIdTxt: Summarizer = (access, value) => {
  const titreTxt = value as TitreTxt | undefined
  if (titreTxt === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(titreTxt["@id_txt"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    items: [
      {
        content: JSON.stringify(titreTxt["@id_txt"]),
        type: "raw_data",
      },
      { class: "mt-1 mx-1", icon: arrowRight, inline: true, type: "icon" },
      {
        content: titreTxt["#text"],
        href: pathname,
        type: "link",
      },
    ],
    type: "concatenation",
  }
}

export function summarizeTm(
  access: Access | undefined,
  value: unknown,
): Summary | undefined {
  const tm = value as Tm | undefined
  if (tm === undefined) {
    return undefined
  }
  return tm.TITRE_TM
}

export const summarizeTmLienTxt: Summarizer = (access, value) => {
  const lienTxt = value as TmLienTxt | undefined
  if (lienTxt === undefined) {
    return undefined
  }
  const pathname = pathnameFromLegalId(lienTxt["@idtxt"])
  if (pathname === undefined) {
    return undefined
  }
  return {
    content: lienTxt["@titretxt"],
    href: pathname,
    type: "link",
  }
}

export const summarizeVersionsWrapperProperties: Summarizer = (
  access,
  value,
) => {
  if (
    access?.key === "versions" &&
    (value === undefined ||
      // Ensure that value is not a dictionary of versions by eli.
      Object.keys(value as { [key: string]: unknown }).some(
        (key) => key.match(/^[A-Z]{8}\d{12}$/) === null,
      ))
  ) {
    return summarizeLegalObject(access, "versions", value)
  }
  if (
    access?.access?.key === "versions" &&
    (Array.isArray(access.parent) ||
      (typeof access?.key === "string" &&
        access.key.match(/^[A-Z]{8}\d{12}$/) !== null))
  ) {
    return summarizeLegalObjectToLink(access, "versions", value)
  }

  return undefined
}
