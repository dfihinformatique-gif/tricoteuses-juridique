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
import { standardSchemaV1 } from "$lib/auditors/standardschema"
import { legiDb } from "$lib/server/databases/index.js"

export const getSectionTa = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<JorfSectionTa | LegiSectionTa | undefined> =>
    (
      await legiDb<
        Array<{
          data: JorfSectionTa | LegiSectionTa
        }>
      >`
        SELECT
          data
        FROM section_ta
        WHERE id = ${id}
      `
    )[0]?.data,
)
