import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditHttpUrl,
  auditNullish,
  auditNumber,
  auditOptions,
  auditRequire,
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

import {
  allLegiTexteEtats,
  allLegiTexteVersionLienNatures,
  allLegiTexteVersionLienTypes,
  allLegiTexteNatures,
  allLegiTexteOrigines,
} from "$lib/legal/legi.js"
import { allSens } from "$lib/legal/shared.js"
import { auditMetaTexteChronicle } from "./texte.js"

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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
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
      [auditNumber, auditFunction((num: number) => num.toString())],
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
    // auditFunction((date: unknown) => {
    //   legiTexteVersionStats.countByLienNature[nature] =
    //     (legiTexteVersionStats.countByLienNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiTexteVersionLienNatures),
  )
  audit.attribute(
    data,
    "@sens",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(allSens),
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
    // auditFunction((date: unknown) => {
    //   legiTexteVersionStats.countByLienType[type] =
    //     (legiTexteVersionStats.countByLienType[type] ?? 0) + 1
    //   return type
    // }),
    auditOptions(allLegiTexteVersionLienTypes),
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
    auditFunction((lien: unknown) => (Array.isArray(lien) ? lien : [lien])),
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
    auditFunction((lien: unknown) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(
      auditSwitch(
        [auditNumber, auditFunction((num: number) => num.toString())],
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
      [auditNumber, auditFunction((id: number) => id.toString())],
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
    // auditFunction((date: unknown) => {
    //   legiTexteVersionStats.countByNature[nature] =
    //     (legiTexteVersionStats.countByNature[nature] ?? 0) + 1
    //   return nature
    // }),
    auditOptions(allLegiTexteNatures),
  )
  audit.attribute(
    data,
    "ORIGINE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    // auditFunction((date: unknown) => {
    //   legiTexteVersionStats.countByOrigine[origine] =
    //     (legiTexteVersionStats.countByOrigine[origine] ?? 0) + 1
    //   return origine
    // }),
    auditOptions(allLegiTexteOrigines),
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

  for (const key of ["AUTORITE", "MINISTERE", "TITRE", "TITREFULL"]) {
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
    // auditFunction((date: unknown) => {
    //   legiTexteVersionStats.countByEtat[etat] =
    //     (legiTexteVersionStats.countByEtat[etat] ?? 0) + 1
    //   return etat
    // }),
    auditOptions(allLegiTexteEtats),
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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
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
    auditSwitch(
      [auditNumber, auditFunction((num: number) => num.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
