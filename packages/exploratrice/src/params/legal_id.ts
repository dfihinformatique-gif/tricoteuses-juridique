import {
  auditChain,
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import type { ParamMatcher } from "@sveltejs/kit"
import { auditLegalId } from "@tricoteuses/legifrance"

export const match = ((param: string): boolean =>
  auditChain(
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  )(cleanAudit, param)[1] === null) satisfies ParamMatcher
