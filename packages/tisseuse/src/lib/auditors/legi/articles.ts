import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditHttpUrl,
  auditInteger,
  auditNumber,
  auditOptions,
  auditRequire,
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

import {
  allLegiArticleEtatsMutable,
  allLegiArticleLienNaturesMutable,
  allLegiArticleLienSensMutable,
  allLegiArticleLienTypesMutable,
  allLegiArticleNaturesMutable,
  allLegiArticleOriginesMutable,
  allLegiArticleTexteNaturesMutable,
  allLegiArticleTypesMutable,
} from "$lib/legal"

export const legiArticleStats: {
  countByEtat: { [etat: string]: number }
  countByLienArtEtat: { [etat: string]: number }
  countByLienNature: { [nature: string]: number }
  countByLienType: { [type: string]: number }
  countByTexteNature: { [nature: string]: number }
  countByVersionEtat: { [etat: string]: number }
} = {
  countByEtat: {},
  countByLienArtEtat: {},
  countByLienNature: {},
  countByLienType: {},
  countByTexteNature: {},
  countByVersionEtat: {},
}

function auditBlocTextuel(
  audit: Audit,
  dataUnknown: unknown,
): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "CONTENU",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditContexte(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "TEXTE",
    true,
    errors,
    remainingKeys,
    auditTexte,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditLegiArticle(
  audit: Audit,
  dataUnknown: unknown,
): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "BLOC_TEXTUEL",
    true,
    errors,
    remainingKeys,
    auditBlocTextuel,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "CONTEXTE",
    true,
    errors,
    remainingKeys,
    auditContexte,
    auditRequire,
  )
  audit.attribute(
    data,
    "LIENS",
    true,
    errors,
    remainingKeys,
    auditSwitch(auditTrimString, auditLiens),
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "META",
    true,
    errors,
    remainingKeys,
    auditMeta,
    auditRequire,
  )
  audit.attribute(
    data,
    "NOTA",
    true,
    errors,
    remainingKeys,
    auditNota,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "VERSIONS",
    true,
    errors,
    remainingKeys,
    auditVersions,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLien(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "#text",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditInteger, auditFunction((num) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  for (const key of ["@cidtexte", "@id", "@nortexte", "@num"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditTrimString,
      auditEmptyToNull,
    )
  }
  audit.attribute(
    data,
    "@datesignatexte",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditDateIso8601String,
  )
  audit.attribute(
    data,
    "@naturetexte",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((nature) => {
    //   legiArticleStats.countByLienNature[nature] =
    //     (legiArticleStats.countByLienNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiArticleLienNaturesMutable),
  )
  audit.attribute(
    data,
    "@numtexte",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "@sens",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allLegiArticleLienSensMutable),
    auditRequire,
  )
  audit.attribute(
    data,
    "@typelien",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((type) => {
    //   legiArticleStats.countByLienType[type] =
    //     (legiArticleStats.countByLienType[type] ?? 0) + 1
    //   return type
    // }),
    auditOptions(allLegiArticleLienTypesMutable),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLienArt(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  for (const key of ["@debut", "@fin"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditDateIso8601String,
      auditRequire,
    )
  }
  audit.attribute(
    data,
    "@etat",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((etat) => {
    //   legiArticleStats.countByLienArtEtat[etat] =
    //     (legiArticleStats.countByLienArtEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allLegiArticleEtatsMutable),
  )
  audit.attribute(
    data,
    "@id",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "@num",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "@origine",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allLegiArticleOriginesMutable),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLiens(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "LIEN",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLien, auditRequire),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMeta(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "META_COMMUN",
    true,
    errors,
    remainingKeys,
    auditMetaCommun,
    auditRequire,
  )
  audit.attribute(
    data,
    "META_SPEC",
    true,
    errors,
    remainingKeys,
    auditMetaSpec,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaArticle(
  audit: Audit,
  dataUnknown: unknown,
): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  for (const key of ["DATE_DEBUT", "DATE_FIN"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditDateIso8601String,
      auditRequire,
    )
  }
  audit.attribute(
    data,
    "ETAT",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((etat) => {
    //   legiArticleStats.countByEtat[etat] =
    //     (legiArticleStats.countByEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allLegiArticleEtatsMutable),
  )
  audit.attribute(
    data,
    "NUM",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditFunction((num) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  audit.attribute(
    data,
    "TYPE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allLegiArticleTypesMutable),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaCommun(
  audit: Audit,
  dataUnknown: unknown,
): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "ANCIEN_ID",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditInteger, auditFunction((id) => id.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  for (const key of ["ID", "URL"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditTrimString,
      auditEmptyToNull,
      auditRequire,
    )
  }
  audit.attribute(
    data,
    "NATURE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allLegiArticleNaturesMutable),
    auditRequire,
  )
  audit.attribute(
    data,
    "ORIGINE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allLegiArticleOriginesMutable),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaSpec(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "META_ARTICLE",
    true,
    errors,
    remainingKeys,
    auditMetaArticle,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditNota(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "CONTENU",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditTexte(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))
  for (const key of [
    "@autorite",
    "@ministere",
    "@nor",
    "@num",
    "@num_parution_jo",
  ]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditTrimString,
      auditEmptyToNull,
    )
  }
  audit.attribute(
    data,
    "@cid",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  for (const key of ["@date_publi", "@date_signature"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditFunction((date) => date.replace(/^11992-12-27$/, "1992-12-27")),
      auditDateIso8601String,
      auditRequire,
    )
  }
  audit.attribute(
    data,
    "@nature",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((nature) => {
    //   legiArticleStats.countByTexteNature[nature] =
    //     (legiArticleStats.countByTexteNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiArticleTexteNaturesMutable),
  )
  audit.attribute(
    data,
    "TITRE_TXT",
    true,
    errors,
    remainingKeys,
    auditFunction((titreTxt) =>
      Array.isArray(titreTxt) ? titreTxt : [titreTxt],
    ),
    auditCleanArray(auditTitreTxt, auditRequire),
    auditRequire,
  )
  audit.attribute(data, "TM", true, errors, remainingKeys, auditTm)

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditTitreTm(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  for (const key of ["#text", "@id"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditSwitch(
        [auditNumber, auditInteger, auditFunction((num) => num.toString())],
        [auditTrimString, auditEmptyToNull],
      ),
      auditRequire,
    )
  }
  for (const key of ["@debut", "@fin"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditDateIso8601String,
      auditRequire,
    )
  }

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditTitreTxt(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  for (const key of ["#text", "@c_titre_court", "@id_txt"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditTrimString,
      auditEmptyToNull,
      auditRequire,
    )
  }
  for (const key of ["@debut", "@fin"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditDateIso8601String,
      auditRequire,
    )
  }

  return audit.reduceRemaining(data, errors, remainingKeys)
}

/// Table des matières
function auditTm(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "TITRE_TM",
    true,
    errors,
    remainingKeys,
    auditFunction((titreTm) => (Array.isArray(titreTm) ? titreTm : [titreTm])),
    auditCleanArray(auditTitreTm, auditRequire),
    auditRequire,
  )
  audit.attribute(data, "TM", true, errors, remainingKeys, auditTm)

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditVersion(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "@etat",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((etat) => {
    //   legiArticleStats.countByVersionEtat[etat] =
    //     (legiArticleStats.countByVersionEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allLegiArticleEtatsMutable),
  )
  audit.attribute(
    data,
    "LIEN_ART",
    true,
    errors,
    remainingKeys,
    auditLienArt,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditVersions(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
  if (dataUnknown == null) {
    return [dataUnknown, null]
  }
  if (typeof dataUnknown !== "object") {
    return audit.unexpectedType(dataUnknown, "object")
  }

  const data = { ...dataUnknown }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  audit.attribute(
    data,
    "VERSION",
    true,
    errors,
    remainingKeys,
    auditFunction((version) => (Array.isArray(version) ? version : [version])),
    auditCleanArray(auditVersion, auditRequire),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
