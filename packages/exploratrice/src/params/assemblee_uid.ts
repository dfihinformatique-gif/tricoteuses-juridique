import {
  auditChain,
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  strictAudit,
} from "@auditors/core"
import type { ParamMatcher } from "@sveltejs/kit"

import { auditAssembleeUid } from "$lib/auditors/assemblee"

export const match = ((param: string): boolean =>
  auditChain(
    auditTrimString,
    auditEmptyToNull,
    auditAssembleeUid,
    auditRequire,
  )(strictAudit, param)[1] === null) satisfies ParamMatcher
