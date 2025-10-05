import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import {
  auditLegalId,
  type JorfSectionTa,
  type LegiSectionTa,
} from "@tricoteuses/legifrance"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import {
  getOrLoadSectionTa,
  newLegalObjectCacheById,
} from "$lib/server/loaders.js"

export const querySectionTa = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<JorfSectionTa | LegiSectionTa | undefined> =>
    await getOrLoadSectionTa(newLegalObjectCacheById(), id),
)
