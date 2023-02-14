import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditInteger,
  auditNullish,
  auditNumber,
  auditOptions,
  auditRequire,
  auditString,
  auditSwitch,
  auditTest,
  auditTrimString,
  type Audit,
} from "@auditors/core"

function auditArborescence(
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
    "LIEN",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditArborescenceLien, auditRequire),
  )
  audit.attribute(
    data,
    "NIVEAU",
    true,
    errors,
    remainingKeys,
    auditFunction((niveau) => (Array.isArray(niveau) ? niveau : [niveau])),
    auditCleanArray(auditArborescenceNiveau, auditRequire),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditArborescenceLien(
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
    auditSwitch(
      [
        auditNumber,
        auditInteger,
        auditFunction((article) => article.toString()),
      ],
      auditTrimString,
    ),
    auditEmptyToNull,
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
    "@libelle",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
  )
  audit.attribute(
    data,
    "@lien",
    true,
    errors,
    remainingKeys,
    // auditFunction((url) => url.replace(/‎/g, "")),
    // auditTrimString,
    // auditFunction((url) =>
    //   url
    //     .replace(/^http:\/\/webdim\//, "http://www.assemblee-nationale.fr/")
    //     .replace(/^https?:\/\/.*(https?):\/\//, "$1://"),
    // ),
    // auditEmptyToNull,
    // auditHttpUrl,
    auditTrimString,
    auditEmptyToNull,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditArborescenceNiveau(
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

  for (const key of ["@id", "@libelle"]) {
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
    "LIEN",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditArborescenceLien, auditRequire),
  )
  audit.attribute(
    data,
    "NIVEAU",
    true,
    errors,
    remainingKeys,
    auditFunction((niveau) => (Array.isArray(niveau) ? niveau : [niveau])),
    auditCleanArray(auditArborescenceNiveau, auditRequire),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditContenu(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "ARBORESCENCE",
    true,
    errors,
    remainingKeys,
    auditArborescence,
    auditRequire,
  )
  for (const key of [
    "CONTENU_DOSSIER_1",
    "CONTENU_DOSSIER_2",
    "CONTENU_DOSSIER_3",
    "CONTENU_DOSSIER_4",
    "CONTENU_DOSSIER_5",
    "EXPOSE_MOTIF",
    "LIBELLE_TEXTE_1",
    "LIBELLE_TEXTE_2",
    "LIBELLE_TEXTE_3",
    "LIBELLE_TEXTE_4",
    "LIBELLE_TEXTE_5",
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
    "ECHEANCIER",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditEcheancier,
    ),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditDossierLegislatif(
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
    "CONTENU",
    true,
    errors,
    remainingKeys,
    auditContenu,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditEcheancier(
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
    "@derniere_maj",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditDateIso8601String,
  )
  audit.attribute(
    data,
    "LIGNE",
    true,
    errors,
    remainingKeys,
    auditFunction((ligne) => (Array.isArray(ligne) ? ligne : [ligne])),
    auditCleanArray(auditLigne, auditRequire),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLegislature(
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
    "LIBELLE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "NUMERO",
    true,
    errors,
    remainingKeys,
    auditInteger,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLienArticle(
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
    auditRequire,
  )
  audit.attribute(
    data,
    "@id",
    true,
    errors,
    remainingKeys,
    auditString,
    auditEmptyToNull,
    auditTest((id) => /^JORFARTI\d{12}$/.test(id), "Invalid ID"),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditLigne(audit: Audit, dataUnknown: unknown): [unknown, unknown] {
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
    "ARTICLE",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [
        auditNumber,
        auditInteger,
        auditFunction((article) => article.toString()),
      ],
      auditTrimString,
    ),
    auditEmptyToNull,
  )
  for (const key of ["BASE_LEGALE", "DECRET", "OBJET"]) {
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
    "CID_LOI_CIBLE",
    true,
    errors,
    remainingKeys,
    auditString,
    auditEmptyToNull,
    auditTest((id) => /^JORFTEXT\d{12}$/.test(id), "Invalid ID"),
  )
  audit.attribute(
    data,
    "DATE_PREVUE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditDateIso8601String,
  )
  audit.attribute(
    data,
    "LIEN_ARTICLE",
    true,
    errors,
    remainingKeys,
    auditFunction((lien) => (Array.isArray(lien) ? lien : [lien])),
    auditCleanArray(auditLienArticle, auditRequire),
  )
  audit.attribute(
    data,
    "NUMERO_ORDRE",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditFunction((numero) => numero.toString())],
      [auditTrimString, auditEmptyToNull],
    ),
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
    "META_DOSSIER_LEGISLATIF",
    true,
    errors,
    remainingKeys,
    auditMetaDossierLegislatif,
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
    auditTrimString,
    auditEmptyToNull,
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
    auditNullish,
  )
  audit.attribute(
    data,
    "ORIGINE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions(["JORF"]),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

function auditMetaDossierLegislatif(
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

  for (const key of ["DATE_CREATION", "DATE_DERNIERE_MODIFICATION"]) {
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
  for (const key of [
    "ID_TEXTE_1",
    "ID_TEXTE_2",
    "ID_TEXTE_3",
    "ID_TEXTE_4",
    "ID_TEXTE_5",
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
    "LEGISLATURE",
    true,
    errors,
    remainingKeys,
    auditLegislature,
    auditRequire,
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
  audit.attribute(
    data,
    "TYPE",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditOptions([
      "LOI_PUBLIEE",
      "PROJET_LOI",
      "PROPOSITION_LOI",
      "ORDONNANCE_PUBLIEE",
    ]),
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
