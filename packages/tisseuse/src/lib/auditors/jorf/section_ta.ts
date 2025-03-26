import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditInteger,
  auditNullish,
  auditOptions,
  auditRequire,
  auditStringToNumber,
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

import {
  allJorfSectionTaLienArtEtats,
  allJorfSectionTaLienArtOrigines,
  // allJorfSectionTaLienSectionTaEtats,
  allJorfSectionTaTexteNatures,
} from "$lib/legal/jorf.js"

export const jorfSectionTaStats: {
  countByLienArtEtat: { [etat: string]: number }
  countByLienArtOrigine: { [origine: string]: number }
  countByLienSectionTaEtat: { [etat: string]: number }
  countByTexteNature: { [nature: string]: number }
} = {
  countByLienArtEtat: {},
  countByLienArtOrigine: {},
  countByLienSectionTaEtat: {},
  countByTexteNature: {},
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

export function auditJorfSectionTa(
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

  for (const key of ["COMMENTAIRE", "TITRE_TA"]) {
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
    "CONTEXTE",
    true,
    errors,
    remainingKeys,
    auditContexte,
    auditRequire,
  )
  audit.attribute(
    data,
    "ID",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "STRUCTURE_TA",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditStructureTa,
    ),
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
    //   jorfSectionTaStats.countByLienArtEtat[etat] =
    //     (jorfSectionTaStats.countByLienArtEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allJorfSectionTaLienArtEtats),
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
    // auditFunction((origine) => {
    //   jorfSectionTaStats.countByLienArtOrigine[origine] =
    //     (jorfSectionTaStats.countByLienArtOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allJorfSectionTaLienArtOrigines),
    auditRequire,
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

  for (const key of ["#text"]) {
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

function auditStructureTa(
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
      //   auditFunction((date) => date.replace(/^11992-12-27$/, "1992-12-27")),
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
    //   jorfSectionTaStats.countByTexteNature[nature] =
    //     (jorfSectionTaStats.countByTexteNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allJorfSectionTaTexteNatures),
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

  audit.attribute(
    data,
    "#text",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
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

  for (const key of ["#text", "@id_txt"]) {
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
    "@c_titre_court",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
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
    auditTitreTm,
    auditRequire,
  )
  audit.attribute(data, "TM", true, errors, remainingKeys, auditTm)

  return audit.reduceRemaining(data, errors, remainingKeys)
}
