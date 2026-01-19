import type { Jo } from "@tricoteuses/legifrance"
import { getOrLoadJo, newLegifranceObjectCache } from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { zodToStandardSchema } from "$lib/zod/standardschema.js"
import { legalId } from "$lib/zod/legifrance.js"
import { legiDb } from "$lib/server/databases/index.js"

export const queryJo = query(
  zodToStandardSchema(legalId()),
  async (id): Promise<Jo | undefined> =>
    await getOrLoadJo(legiDb, newLegifranceObjectCache(), id),
)
