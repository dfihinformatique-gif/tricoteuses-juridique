import type {
  JorfTexteVersion,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"

export const cleanTexteTitle = <StringOrUndefined extends string | undefined>(
  title: StringOrUndefined,
): StringOrUndefined =>
  title
    ?.replace(/\n/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/ \(\d+\)\.?$/, "")
    .replace(/\.$/, "") as StringOrUndefined

/**
 * TODO: Migrate to @tricoteuses/legifrance
 */
export const getTexteVersionDateDebut = (
  texteVersion: JorfTexteVersion | LegiTexteVersion,
): string => {
  const dateDebut = texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT
  if (
    dateDebut === undefined ||
    ["2222-02-22", "2999-01-01"].includes(dateDebut)
  ) {
    return texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI
  }
  return dateDebut
}

/**
 * TODO: Migrate to @tricoteuses/legifrance
 */
export const getTexteVersionDateSignature = (
  texteVersion: JorfTexteVersion | LegiTexteVersion,
): string => {
  const dateSignature =
    texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
  if (!["2222-02-22", "2999-01-01"].includes(dateSignature)) {
    return dateSignature
  }
  const dateDebut = texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT
  if (
    dateDebut !== undefined &&
    !["2222-02-22", "2999-01-01"].includes(dateDebut)
  ) {
    return dateDebut
  }
  throw new Error(
    `Missing date signature in text ${texteVersion.META.META_COMMUN.ID}`,
  )
}

/**
 * TODO: Migrate to @tricoteuses/legifrance
 */
export const sortTextesVersionsByDate =
  (
    dateFromTexteVersion: (
      texteVersion: JorfTexteVersion | LegiTexteVersion,
    ) => string,
  ) =>
  (
    texteVersion1: JorfTexteVersion | LegiTexteVersion,
    texteVersion2: JorfTexteVersion | LegiTexteVersion,
  ): number => {
    const date1 = dateFromTexteVersion(texteVersion1)
    const date2 = dateFromTexteVersion(texteVersion2)
    if (date1 !== date2) {
      return date1.localeCompare(date2)
    }
    const metaCommun1 = texteVersion1.META.META_COMMUN
    const origine1 = metaCommun1.ORIGINE
    const metaCommun2 = texteVersion2.META.META_COMMUN
    const origine2 = metaCommun2.ORIGINE
    if (origine1 !== origine2) {
      if (origine1 === "JORF") {
        return -1
      } else if (origine2 === "JORF") {
        return 1
      }
    }
    throw new Error(
      `TODO: Unable to sort texts ${metaCommun1.ID} & ${metaCommun2.ID} by date.`,
    )
  }
