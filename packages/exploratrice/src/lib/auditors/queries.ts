import {
  auditArray,
  auditChain,
  auditCleanArray,
  auditFunction,
  auditNullish,
  auditSetNullish,
  auditString,
  auditSwitch,
  auditTest,
  type Auditor,
} from "@auditors/core"

export function auditQueryArray(...auditors: Auditor[]) {
  return auditChain(
    auditSwitch(
      auditNullish,
      [auditString, ...auditors, auditFunction((value) => [value])],
      auditCleanArray(...auditors),
    ),
    auditSetNullish([]),
  )
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
