import {
  type Audit,
  auditRequire,
  auditDateIso8601String,
  auditArray,
  auditTrimString,
  auditInteger,
  auditFunction,
  auditStringToNumber,
  auditEmptyToNull,
  auditNullish,
  auditSwitch,
  auditString,
  auditTest,
  auditNumber,
} from "@auditors/core"

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
    "ECHEANCIER",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditTrimString, auditEmptyToNull, auditNullish],
      auditEcheancier,
    ),
  )

  // TODO

  // TODO
  // return audit.reduceRemaining(data, errors, remainingKeys)
  return audit.reduceErrors(data, errors)
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
    auditArray(auditLigne, auditRequire),
    auditRequire,
  )

  // TODO

  // TODO
  // return audit.reduceRemaining(data, errors, remainingKeys)
  return audit.reduceErrors(data, errors)
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
    "@id",
    true,
    errors,
    remainingKeys,
    auditString,
    auditEmptyToNull,
    auditTest((id) => /^JORFARTI\d{12}$/.test(id), "Invalid ID"),
    auditRequire,
  )
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
    auditArray(auditLienArticle, auditRequire),
  )
  audit.attribute(
    data,
    "NUMERO_ORDRE",
    true,
    errors,
    remainingKeys,
    auditSwitch(
      [auditNumber, auditInteger, auditFunction((numero) => numero.toString())],
      auditTrimString,
    ),
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

  // TODO

  // TODO
  // return audit.reduceRemaining(data, errors, remainingKeys)
  return audit.reduceErrors(data, errors)
}
