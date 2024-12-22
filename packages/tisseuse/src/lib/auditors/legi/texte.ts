import {
  auditCleanArray,
  auditDateIso8601String,
  auditEmptyToNull,
  auditFunction,
  auditInteger,
  auditNullish,
  auditNumber,
  auditRequire,
  auditSwitch,
  auditTrimString,
  type Audit,
} from "@auditors/core"

export function auditMetaTexteChronicle(
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
