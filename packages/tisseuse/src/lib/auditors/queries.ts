import {
  auditArray,
  auditChain,
  auditCleanArray,
  auditFunction,
  auditInteger,
  auditNullish,
  auditOptions,
  auditSetNullish,
  auditSingleton,
  auditStringToNumber,
  auditSwitch,
  auditTest,
  auditTrimString,
  auditUnique,
  type Audit,
  type Auditor,
} from "@auditors/core"

import { allFollows } from "$lib/aggregates.js"

export function auditFollowQuery(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  audit.attribute(
    data,
    "follow",
    true,
    errors,
    remainingKeys,
    auditQueryOptionsSet(allFollows),
  )
}

export function auditFollowWithFalseQuery(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  audit.attribute(
    data,
    "follow",
    true,
    errors,
    remainingKeys,
    auditQueryOptionsSet([...allFollows, "false"]),
  )
}

export function auditLimitQueryParameter(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  audit.attribute(
    data,
    "limit",
    true,
    errors,
    remainingKeys,
    auditSingleton(
      auditTrimString,
      auditStringToNumber,
      auditInteger,
      auditTest(
        (value: number) => value >= 1,
        "Value must be greater than or equal to 1",
      ),
      auditTest(
        (value: number) => value <= 100,
        "Value must be less than or equal to 100",
      ),
      auditSetNullish(20),
    ),
  )
}

export function auditOffsetQueryParameter(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  audit.attribute(
    data,
    "offset",
    true,
    errors,
    remainingKeys,
    auditSingleton(
      auditTrimString,
      auditStringToNumber,
      auditInteger,
      auditTest(
        (value: number) => value >= 0,
        "Value must be greater than or equal to 0",
      ),
      auditSetNullish(0),
    ),
  )
}

export function auditPaginationQuery(
  audit: Audit,
  query: URLSearchParams,
): [unknown, unknown] {
  if (query == null) {
    return [query, null]
  }
  if (!(query instanceof URLSearchParams)) {
    return audit.unexpectedType(query, "URLSearchParams")
  }

  const data: { [key: string]: unknown } = {}
  for (const [key, value] of query.entries()) {
    let values = data[key] as string[] | undefined
    if (values === undefined) {
      values = data[key] = []
    }
    values.push(value)
  }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  auditLimitQueryParameter(audit, data, errors, remainingKeys)
  auditOffsetQueryParameter(audit, data, errors, remainingKeys)

  // Keep the remaining keys as is.
  remainingKeys.clear()

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditQQueryParameter(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  audit.attribute(
    data,
    "q",
    true,
    errors,
    remainingKeys,
    auditSingleton(auditTrimString),
  )
}
export const auditQueryArray = auditChain(
  auditSwitch(
    auditNullish,
    [auditTrimString, auditFunction((value) => [value])],
    auditCleanArray(auditTrimString),
  ),
  auditSetNullish([]),
)

export function auditQueryOptionsArray(
  possibleValues: readonly string[],
): Auditor {
  return auditChain(
    auditQueryArray,
    auditArray(auditOptions(possibleValues)),
    auditUnique,
    auditSetNullish([]),
  )
}

export function auditQueryOptionsSet(
  possibleValues: readonly string[],
): Auditor {
  return auditChain(
    auditQueryOptionsArray(possibleValues),
    auditFunction((values) => new Set(values)),
    auditSetNullish(new Set()),
  )
}

export const auditQuerySet = auditChain(
  auditQueryArray,
  auditFunction((values) => new Set(values)),
  auditSetNullish(new Set()),
)

export function auditSearchQuery(
  audit: Audit,
  query: URLSearchParams,
): [unknown, unknown] {
  if (query == null) {
    return [query, null]
  }
  if (!(query instanceof URLSearchParams)) {
    return audit.unexpectedType(query, "URLSearchParams")
  }

  const data: { [key: string]: unknown } = {}
  for (const [key, value] of query.entries()) {
    let values = data[key] as string[] | undefined
    if (values === undefined) {
      values = data[key] = []
    }
    values.push(value)
  }
  const errors: { [key: string]: unknown } = {}
  const remainingKeys = new Set(Object.keys(data))

  auditSearchQueryContent(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditSearchQueryContent(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  auditLimitQueryParameter(audit, data, errors, remainingKeys)
  auditOffsetQueryParameter(audit, data, errors, remainingKeys)
  auditQQueryParameter(audit, data, errors, remainingKeys)
}
