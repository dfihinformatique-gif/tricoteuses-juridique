import {
  auditEmptyToNull,
  auditHttpUrl,
  auditInteger,
  auditOptions,
  auditRequire,
  auditStringToNumber,
  auditTest,
  auditTrimString,
  cleanAudit,
  type Audit,
} from "@auditors/core"

import { linkTypes } from "$lib/links"

export function auditConfig(
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

  for (const key of [
    "assembleeDb",
    "europeDb",
    "legiAnomaliesDb",
    "legiDb",
    "tisseuseDb",
  ]) {
    audit.attribute(
      data,
      key,
      true,
      errors,
      remainingKeys,
      auditDb,
      auditRequire,
    )
  }
  audit.attribute(
    data,
    "linkBaseUrl",
    true,
    errors,
    remainingKeys,
    auditHttpUrl,
    auditRequire,
  )
  audit.attribute(
    data,
    "linkType",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditOptions(linkTypes),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditDb(
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

  for (const key of ["database", "host", "password", "user"]) {
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
    "port",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditStringToNumber,
    auditInteger,
    auditTest(
      (value: number) => 0 <= value && value <= 65536,
      "Must be an integer between 0 and 65536",
    ),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function validateConfig(data: unknown): [unknown, unknown] {
  return auditConfig(cleanAudit, data)
}
