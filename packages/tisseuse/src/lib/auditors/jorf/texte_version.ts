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
  allJorfTexteVersionLienNaturesMutable,
  allJorfTexteVersionLienTypesMutable,
  allJorfTexteVersionNaturesMutable,
  allJorfTexteVersionOriginesMutable,
  allSensMutable,
} from "$lib/legal"

export const jorfTexteVersionStats: {
  countByLienNature: { [nature: string]: number }
  countByLienType: { [type: string]: number }
  countByNature: { [nature: string]: number }
  countByOrigine: { [origine: string]: number }
} = {
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

function auditDatesEffet(
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
    "DATE_EFFET",
    true,
    errors,
    remainingKeys,
    auditFunction((date) => (Array.isArray(date) ? date : [date])),
    auditCleanArray(auditDateIso8601String, auditRequire),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditDomaines(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "DOMAINE",
    true,
    errors,
    remainingKeys,
    auditFunction((domaine) => (Array.isArray(domaine) ? domaine : [domaine])),
    auditCleanArray(auditTrimString, auditEmptyToNull, auditRequire),
    auditRequire,
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

function auditEntreprise(
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
    "@texte_entreprise",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(["non", "oui"]),
    auditRequire,
  )
  audit.attribute(
    data,
    "DATES_EFFET",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditDatesEffet,
    ),
  )
  audit.attribute(
    data,
    "DOMAINES",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditDomaines,
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditJorfTexteVersion(
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
    "ENTREPRISE",
    true,
    errors,
    remainingKeys,
    auditEntreprise,
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
    "NOTICE",
    true,
    errors,
    remainingKeys,
    auditNotice,
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
    "SM",
    true,
    errors,
    remainingKeys,
    auditSm,
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
  for (const key of ["@cidtexte", "@id"]) {
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
    //   jorfTexteVersionStats.countByLienNature[nature] =
    //     (jorfTexteVersionStats.countByLienNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allJorfTexteVersionLienNaturesMutable),
  )
  for (const key of ["@num", "@nortexte", "@numtexte"]) {
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
    //   jorfTexteVersionStats.countByLienType[type] =
    //     (jorfTexteVersionStats.countByLienType[type] ?? 0) + 1
    //   return type
    // }),
    auditOptions(allJorfTexteVersionLienTypesMutable),
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
    //   jorfTexteVersionStats.countByNature[nature] =
    //     (jorfTexteVersionStats.countByNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allJorfTexteVersionNaturesMutable),
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
    //   jorfTexteVersionStats.countByOrigine[origine] =
    //     (jorfTexteVersionStats.countByOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allJorfTexteVersionOriginesMutable),
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
  for (const key of ["DATE_PUBLI", "DATE_TEXTE"]) {
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
  for (const key of ["ORIGINE_PUBLI"]) {
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
  for (const key of ["TITREFULL"]) {
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
