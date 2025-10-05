import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { auditLegalId, type Jo } from "@tricoteuses/legifrance"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { getOrLoadJo, newLegalObjectCacheById } from "$lib/server/loaders.js"

export const queryJo = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<Jo | undefined> =>
    await getOrLoadJo(newLegalObjectCacheById(), id),
)
