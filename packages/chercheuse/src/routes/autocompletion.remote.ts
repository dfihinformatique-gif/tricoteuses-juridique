import { auditTrimString, cleanAudit } from "@auditors/core"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema"
import { tisseuseDb } from "$lib/server/databases/index.js"

export const autocomplete = query(
  standardSchemaV1<string>(cleanAudit, auditTrimString),
  async (
    q,
  ): Promise<
    Array<{
      autocompletion: string
      distance: number
      id: string
    }>
  > =>
    await tisseuseDb<
      Array<{
        autocompletion: string
        distance: number
        id: string
      }>
    >`
      SELECT
        autocompletion,
        autocompletion <-> ${q} AS distance,
        id
      FROM titre_texte_autocompletion
      ORDER BY distance, autocompletion
      LIMIT 10
    `,
)
