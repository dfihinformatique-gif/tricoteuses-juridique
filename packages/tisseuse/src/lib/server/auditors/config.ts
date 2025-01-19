import {
  auditEmail,
  auditEmptyToNull,
  auditHttpUrl,
  auditInteger,
  auditRequire,
  auditStringToNumber,
  auditTest,
  auditTrimString,
  cleanAudit,
  type Audit,
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
  audit.attribute(data, "forgejo", true, errors, remainingKeys, auditForgejo)
  audit.attribute(
    data,
    "title",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "url",
    true,
    errors,
    remainingKeys,
    auditHttpUrl,
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
      (value) => 0 <= value && value <= 65536,
      "Must be an integer between 0 and 65536",
    ),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditForgejo(
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
    "sshAccount",
    true,
    errors,
    remainingKeys,
    auditEmail,
    auditRequire,
  )
  audit.attribute(
    data,
    "sshPort",
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
  audit.attribute(
    data,
    "token",
    true,
    errors,
    remainingKeys,
    auditTrimString,
    auditEmptyToNull,
    auditRequire,
  )
  audit.attribute(
    data,
    "url",
    true,
    errors,
    remainingKeys,
    auditHttpUrl,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function validateConfig(data: unknown): [unknown, unknown] {
  return auditConfig(cleanAudit, data)
}
