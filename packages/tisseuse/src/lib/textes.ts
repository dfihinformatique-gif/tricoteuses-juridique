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
export function getTexteVersionDateSignature(
  texteVersion: JorfTexteVersion | LegiTexteVersion,
  // legalObjectCacheById: LegalObjectCacheById = newLegalObjectCacheById(),
): string {
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
