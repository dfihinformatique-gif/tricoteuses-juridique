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
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

import {
  allLegiTexteVersionEtatsMutable,
  allLegiTexteVersionLienNaturesMutable,
  allLegiTexteVersionLienTypesMutable,
  allLegiTexteVersionNaturesMutable,
  allLegiTexteVersionOriginesMutable,
  allSensMutable,
} from "$lib/legal"

export const legiTexteVersionStats: {
  countByEtat: { [etat: string]: number }
  countByLienNature: { [nature: string]: number }
  countByLienType: { [type: string]: number }
  countByNature: { [nature: string]: number }
  countByOrigine: { [origine: string]: number }
} = {
  countByEtat: {},
  countByLienNature: {},
  countByLienType: {},
  countByNature: {},
  countByOrigine: {},
}

function auditAbro(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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

export function auditLegiTexteVersion(
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
    "ABRO",
    true,
    errors,
    remainingKeys,
    auditAbro,
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
    "RECT",
    true,
    errors,
    remainingKeys,
    auditRect,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "SIGNATAIRES",
    true,
    errors,
    remainingKeys,
    auditSignataires,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "TP",
    true,
    errors,
    remainingKeys,
    auditTp,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "VISAS",
    true,
    errors,
    remainingKeys,
    auditVisas,
    auditEmptyToNull,
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
      [auditNumber, auditFunction((num) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )
  for (const key of ["@cidtexte", "@id", "@nortexte", "@num", "@numtexte"]) {
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
    //   legiTexteVersionStats.countByLienNature[nature] =
    //     (legiTexteVersionStats.countByLienNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiTexteVersionLienNaturesMutable),
  )
  audit.attribute(
    data,
    "@sens",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allSensMutable),
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
    //   legiTexteVersionStats.countByLienType[type] =
    //     (legiTexteVersionStats.countByLienType[type] ?? 0) + 1
    //   return type
    // }),
    auditOptions(allLegiTexteVersionLienTypesMutable),
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

/// Mots-clés du texte
function auditMcsTxt(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "MC",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(
      auditSwitch(
        [auditNumber, auditFunction((num) => num.toString())],
        [auditTrimString, auditEmptyToNull],
      ),
    ),
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
    //   legiTexteVersionStats.countByNature[nature] =
    //     (legiTexteVersionStats.countByNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiTexteVersionNaturesMutable),
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
    //   legiTexteVersionStats.countByOrigine[origine] =
    //     (legiTexteVersionStats.countByOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allLegiTexteVersionOriginesMutable),
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
  audit.attribute(
    data,
    "META_TEXTE_VERSION",
    true,
    errors,
    remainingKeys,
    auditMetaTexteVersion,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaTexteChronicle(
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

  for (const key of ["CID"]) {
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
  for (const key of ["DATE_PUBLI", "DATE_TEXTE", "DERNIERE_MODIFICATION"]) {
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
  for (const key of ["NOR", "NUM"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditSwitch(
        [auditNumber, auditFunction((num) => num.toString())],
        [auditTrimString, auditEmptyToNull],
      ),
    )
  }
  for (const key of [
    "NUM_PARUTION",
    "NUM_SEQUENCE",
    "PAGE_DEB_PUBLI",
    "PAGE_FIN_PUBLI",
  ]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditSwitch(
        [auditNumber, auditInteger],
        [auditTrimString, auditEmptyToNull, auditNullish],
      ),
    )
  }
  audit.attribute(
    data,
    "ORIGINE_PUBLI",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "VERSIONS_A_VENIR",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditVersionsAVenir,
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaTexteVersion(
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

  for (const key of ["AUTORITE", "MINISTERE", "TITRE"]) {
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
  for (const key of ["DATE_DEBUT", "DATE_FIN"]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditTrimString,
      auditEmptyToNull,
      auditDateIso8601String,
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
    //   legiTexteVersionStats.countByEtat[etat] =
    //     (legiTexteVersionStats.countByEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allLegiTexteVersionEtatsMutable),
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
    "MCS_TXT",
    true,
    errors,
    remainingKeys,
    auditSwitch([auditTrimString, auditEmptyToNull, auditNullish], auditMcsTxt),
  )
  audit.attribute(
    data,
    "TITREFULL",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
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

function auditNotice(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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

function auditRect(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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

function auditSignataires(
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

function auditSm(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    auditSwitch(
      [auditNumber, auditFunction((num) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditTp(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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

function auditVisas(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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

function auditVersionsAVenir(
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
    "VERSION_A_VENIR",
    true,
    errors,
    remainingKeys,
    auditFunction((date) => (Array.isArray(date) ? date : [date])),
    auditCleanArray(auditDateIso8601String, auditRequire),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
