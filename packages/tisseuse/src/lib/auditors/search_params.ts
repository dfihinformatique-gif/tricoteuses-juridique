import type { Audit, Auditor } from "@auditors/core"
import {
  auditArray,
  auditChain,
  auditCleanArray,
  auditFunction,
  auditInteger,
  auditNullish,
  auditOptions,
  auditSetNullish,
  auditStringToNumber,
  auditSwitch,
  auditTest,
  auditTrimString,
  auditUnique,
} from "@auditors/core"

import { allFollowsMutable } from "$lib/aggregates"

export function auditFollowSearchParams(
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
    auditSearchParamsOptionsSet(allFollowsMutable),
  )
}

export function auditFollowWithFalseSearchParams(
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
    auditSearchParamsOptionsSet([...allFollowsMutable, "false"]),
  )
}

export function auditLimitSearchParam(
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

export function auditOffsetSearchParam(
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

export function auditPaginationSearchParams(
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

  auditLimitSearchParam(audit, data, errors, remainingKeys)
  auditOffsetSearchParam(audit, data, errors, remainingKeys)

  // Keep the remaining keys as is.
  remainingKeys.clear()

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditQSearchParam(
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
export const auditSearchParamsArray = auditChain(
  auditSwitch(
    auditNullish,
    [auditTrimString, auditFunction((value) => [value])],
    auditCleanArray(auditTrimString),
  ),
  auditSetNullish([]),
)

export function auditSearchParamsOptionsArray(
  possibleValues: string[],
): Auditor {
  return auditChain(
    auditSearchParamsArray,
    auditArray(auditOptions(possibleValues)),
    auditUnique,
    auditSetNullish([]),
  )
}

export function auditSearchParamsOptionsSet(possibleValues: string[]): Auditor {
  return auditChain(
    auditSearchParamsOptionsArray(possibleValues),
    auditFunction((values) => new Set(values)),
    auditSetNullish(new Set()),
  )
}

export const auditSearchParamsSet = auditChain(
  auditSearchParamsArray,
  auditFunction((values) => new Set(values)),
  auditSetNullish(new Set()),
)

export function auditSearchSearchParams(
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

  auditSearchSearchParamsContent(audit, data, errors, remainingKeys)

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditSearchSearchParamsContent(
  audit: Audit,
  data: { [key: string]: unknown },
  errors: { [key: string]: unknown },
  remainingKeys: Set<string>,
): void {
  auditLimitSearchParam(audit, data, errors, remainingKeys)
  auditOffsetSearchParam(audit, data, errors, remainingKeys)
  auditQSearchParam(audit, data, errors, remainingKeys)
}

export function auditSingleton(...auditors: Auditor[]): Auditor {
  return auditChain(
    auditArray(),
    auditTest(
      (values) => values.length <= 1,
      "Parameter must be present only once in query",
    ),
    auditFunction((value) => value[0]),
    ...auditors,
  )
}
