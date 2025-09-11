import {
  type Audit,
  auditChain,
  auditRequire,
  auditString,
  auditTest,
  auditOptions,
} from "@auditors/core"

export const auditId = auditChain(
  auditString,
  auditTest((id: string) => id.length === 20, "Invalid length for ID"),
)

export function auditVersions(
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
    "VERSION",
    true,
    errors,
    remainingKeys,
    auditVersionsVersion,
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}

export function auditVersionsVersion(
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
    auditId,
    auditRequire,
  )
  audit.attribute(
    data,
    "@fin",
    true,
    errors,
    remainingKeys,
    auditString,
    auditOptions(["2999-01-01"]),
    auditRequire,
  )
  audit.attribute(
    data,
    "@etat",
    true,
    errors,
    remainingKeys,
    auditString,
    auditOptions([""]),
    auditRequire,
  )
  audit.attribute(
    data,
    "@debut",
    true,
    errors,
    remainingKeys,
    auditString,
    auditOptions(["2999-01-01"]),
    auditRequire,
  )

  return audit.reduceRemaining(data, errors, remainingKeys)
}
