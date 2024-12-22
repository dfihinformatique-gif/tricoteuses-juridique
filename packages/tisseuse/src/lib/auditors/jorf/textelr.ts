import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditHttpUrl,
  auditInteger,
  auditNullish,
  auditNumber,
  auditOptions,
  auditRequire,
  auditStringToNumber,
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

import {
  allJorfTextelrEtats,
  allJorfTextelrLienArtEtats,
  // allJorfTextelrLienArtNatures,
  allJorfTextelrLienArtOrigines,
  allJorfTexteNatures,
  allJorfTexteOrigines,
} from "$lib/legal"

import { auditMetaTexteChronicle } from "./texte"

export const jorfTextelrStats: {
  countByEtat: { [etat: string]: number }
  countByLienArtEtat: { [etat: string]: number }
  countByLienArtNature: { [nature: string]: number }
  countByLienArtOrigine: { [origine: string]: number }
  countByNature: { [nature: string]: number }
  countByOrigine: { [origine: string]: number }
} = {
  countByEtat: {},
  countByLienArtEtat: {},
  countByLienArtNature: {},
  countByLienArtOrigine: {},
  countByNature: {},
  countByOrigine: {},
}

function auditEliAlias(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "ID_ELI_ALIAS",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditHttpUrl,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditJorfTextelr(
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
    "META",
    true,
    errors,
    remainingKeys,
    auditMeta,
    auditRequire,
  )
  audit.attribute(
    data,
    "STRUCT",
    true,
    errors,
    remainingKeys,
    auditSwitch([auditTrimString, auditEmptyToNull, auditNullish], auditStruct),
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
    //   jorfTextelrStats.countByLienArtEtat[etat] =
    //     (jorfTextelrStats.countByLienArtEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allJorfTextelrLienArtEtats),
  )
  for (const key of ["@id"]) {
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
    "@nature",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((nature) => {
    //   jorfTextelrStats.countByLienArtNature[nature] =
    //     (jorfTextelrStats.countByLienArtNature[nature] ?? 0) + 1
    //   return nature
    // }),
    // auditOptions(allJorfTextelrLienArtNatures),
    auditNullish,
  )
  for (const key of ["@num"]) {
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
    "@origine",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((origine) => {
    //   jorfTextelrStats.countByLienArtOrigine[origine] =
    //     (jorfTextelrStats.countByLienArtOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allJorfTextelrLienArtOrigines),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLienSectionTa(
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
    "#text",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
  for (const key of ["@cid", "@id", "@url"]) {
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
  audit.attribute(
    data,
    "@etat",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((etat) => {
    //   jorfSectionTaStats.countByLienSectionTaEtat[etat] =
    //     (jorfSectionTaStats.countByLienSectionTaEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    // auditOptions(allJorfSectionTaLienSectionTaEtats),
    auditNullish,
  )
  audit.attribute(
    data,
    "@niv",
    true,
    errors,
    remainingKeys,
    auditStringToNumber,
    auditInteger,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLienTxt(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
      [auditNumber, auditFunction((id) => id.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  audit.attribute(data, "ELI_ALIAS", true, errors, remainingKeys, auditEliAlias)
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
    "ID_ELI",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditHttpUrl,
  )
  audit.attribute(
    data,
    "NATURE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((nature) => {
    //   jorfTextelrStats.countByNature[nature] =
    //     (jorfTextelrStats.countByNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allJorfTexteNatures),
  )
  audit.attribute(
    data,
    "ORIGINE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((origine) => {
    //   jorfTextelrStats.countByOrigine[origine] =
    //     (jorfTextelrStats.countByOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allJorfTexteOrigines),
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
    "META_TEXTE_CHRONICLE",
    true,
    errors,
    remainingKeys,
    auditMetaTexteChronicle,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditStruct(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "LIEN_ART",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLienArt, auditRequire),
  )
  audit.attribute(
    data,
    "LIEN_SECTION_TA",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLienSectionTa, auditRequire),
  )

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
    //   jorfTextelrStats.countByEtat[etat] =
    //     (jorfTextelrStats.countByEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allJorfTextelrEtats),
  )
  audit.attribute(
    data,
    "LIEN_TXT",
    true,
    errors,
    remainingKeys,
    auditLienTxt,
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
