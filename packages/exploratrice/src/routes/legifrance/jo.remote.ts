import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { auditLegalId, type Jo } from "@tricoteuses/legifrance"
import {
  getOrLoadJo,
  newLegalObjectCacheByIdByCategorieTag,
} from "@tricoteuses/tisseuse"

import { legiDb } from "$lib/server/databases/index.js"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"

export const queryJo = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<Jo | undefined> =>
    await getOrLoadJo(legiDb, newLegalObjectCacheByIdByCategorieTag(), id),
)
