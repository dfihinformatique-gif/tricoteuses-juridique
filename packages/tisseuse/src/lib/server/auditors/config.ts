import {
  type Audit,
  auditInteger,
  auditRequire,
  auditStringToNumber,
  auditTest,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"

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

  audit.attribute(
    data,
    "assembleeDb",
    true,
    errors,
    remainingKeys,
    auditDb,
    auditRequire,
  )
  audit.attribute(
    data,
    "db",
    true,
    errors,
    remainingKeys,
    auditDb,
    auditRequire,
  )
  audit.attribute(
    data,
    "title",
    true,
    errors,
    remainingKeys,
    auditTrimString,
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
      (value) => 0 <= value && value <= 65536,
      "Must be an integer between 0 and 65536",
    ),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function validateConfig(data: unknown): [unknown, unknown] {
  return auditConfig(cleanAudit, data)
}
