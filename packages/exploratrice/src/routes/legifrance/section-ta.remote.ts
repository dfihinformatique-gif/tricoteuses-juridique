import type { JorfSectionTa, LegiSectionTa } from "@tricoteuses/legifrance"
import {
  getOrLoadSectionTa,
  newLegifranceObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { zodToStandardSchema } from "$lib/zod/standardschema.js"
import { legalId } from "$lib/zod/legifrance.js"
import { legiDb } from "$lib/server/databases/index.js"

export const querySectionTa = query(
  zodToStandardSchema(legalId()),
  async (id): Promise<JorfSectionTa | LegiSectionTa | undefined> =>
    await getOrLoadSectionTa(legiDb, newLegifranceObjectCache(), id),
)
