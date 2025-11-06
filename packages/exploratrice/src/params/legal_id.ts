import {
  auditChain,
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  strictAudit,
} from "@auditors/core"
import type { ParamMatcher } from "@sveltejs/kit"
import { auditLegalId } from "@tricoteuses/legifrance"

export const match = ((param: string): boolean =>
  auditChain(
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  )(strictAudit, param)[1] === null) satisfies ParamMatcher
