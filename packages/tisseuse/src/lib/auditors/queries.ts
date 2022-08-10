import type { Audit, Auditor } from "@auditors/core"
import {
  auditArray,
  auditChain,
  auditFunction,
  auditInteger,
  auditSetNullish,
  auditStringToNumber,
  auditTest,
  auditTrimString,
} from "@auditors/core"

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

  audit.attribute(
    data,
    "limit",
    true,
    errors,
    remainingKeys,
    auditQuerySingleton(
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
      auditSetNullish(10),
    ),
  )
  audit.attribute(
    data,
    "offset",
    true,
    errors,
    remainingKeys,
    auditQuerySingleton(
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

  // Keep the remaining keys as is.
  remainingKeys.clear()

  return audit.reduceRemaining(data, errors, remainingKeys, auditSetNullish({}))
}

export function auditQuerySingleton(...auditors: Auditor[]) {
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
) {
  audit.attribute(
    data,
    "limit",
    true,
    errors,
    remainingKeys,
    auditQuerySingleton(
      auditTrimString,
      auditStringToNumber,
      auditInteger,
      auditTest(
        (value: number) => value >= 1,
        "Value must be greater than or equal to 1",
      ),
      auditTest(
        (value: number) => value <= 1000,
        "Value must be less than or equal to 1000",
      ),
      auditSetNullish(20),
    ),
  )
  audit.attribute(
    data,
    "offset",
    true,
    errors,
    remainingKeys,
    auditQuerySingleton(
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
  audit.attribute(
    data,
    "q",
    true,
    errors,
    remainingKeys,
    auditQuerySingleton(auditTrimString),
  )
}
