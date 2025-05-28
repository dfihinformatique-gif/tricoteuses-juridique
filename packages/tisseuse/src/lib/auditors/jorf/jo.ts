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

import { allJoNatures, allJoOrigines } from "$lib/legal/jorf.js"

export const joStats: {
  countByNature: { [nature: string]: number }
  countByOrigine: { [origine: string]: number }
} = {
  countByNature: {},
  countByOrigine: {},
}

export function auditJo(
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
    "STRUCTURE_TXT",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditStructureTxt,
    ),
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

  audit.attribute(
    data,
    "@idtxt",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "@titretxt",
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
      [auditNumber, auditFunction((id: number) => id.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
    auditNullish,
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
    //   joStats.countByNature[nature] = (joStats.countByNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allJoNatures),
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
    // auditFunction((origine) => {
    //   joStats.countByOrigine[origine] =
    //     (joStats.countByOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allJoOrigines),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaConteneur(
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
    "DATE_PUBLI",
    true,
    errors,
    remainingKeys,
    auditDateIso8601String,
    auditRequire,
  )
  audit.attribute(
    data,
    "NUM",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  audit.attribute(
    data,
    "TITRE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
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
    "META_CONTENEUR",
    true,
    errors,
    remainingKeys,
    auditMetaConteneur,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditStructureTxt(
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
    "LIEN_TXT",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLienTxt, auditRequire),
  )
  audit.attribute(
    data,
    "TM",
    true,
    errors,
    remainingKeys,
    auditFunction((tm) => (Array.isArray(tm) ? tm : [tm])),
    auditCleanArray(auditTm, auditRequire),
  )

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
    "@niv",
    true,
    errors,
    remainingKeys,
    auditStringToNumber,
    auditInteger,
    auditRequire,
  )
  audit.attribute(
    data,
    "LIEN_TXT",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLienTxt, auditRequire),
  )
  audit.attribute(
    data,
    "TITRE_TM",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "TM",
    true,
    errors,
    remainingKeys,
    auditFunction((tm) => (Array.isArray(tm) ? tm : [tm])),
    auditCleanArray(auditTm, auditRequire),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
