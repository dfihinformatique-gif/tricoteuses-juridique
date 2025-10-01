import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { auditLegalId, type Jo } from "@tricoteuses/legifrance"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema"
import { legiDb } from "$lib/server/databases/index.js"

export const getJo = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<Jo | undefined> =>
    (
      await legiDb<
        Array<{
          data: Jo
        }>
      >`
        SELECT
          data
        FROM jo
        WHERE id = ${id}
      `
    )[0]?.data,
)
