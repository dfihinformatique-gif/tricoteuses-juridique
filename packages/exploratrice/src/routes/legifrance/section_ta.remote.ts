import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"
import {
  auditLegalId,
  type JorfSectionTa,
  type LegiSectionTa,
} from "@tricoteuses/legifrance"
import {
  getOrLoadSectionTa,
  newLegifranceObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb } from "$lib/server/databases/index.js"

export const querySectionTa = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<JorfSectionTa | LegiSectionTa> =>
    (await getOrLoadSectionTa(legiDb, newLegifranceObjectCache(), id)) ??
    error(404),
)
