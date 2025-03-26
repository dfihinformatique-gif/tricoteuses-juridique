import { error } from "@sveltejs/kit"

import type { IdWrapper } from "$lib/legal/index.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const idWrapper = (
    await db<{ data: IdWrapper }[]>`
    SELECT eli, id FROM id
    WHERE eli = ${params.eli}
  `
  )[0]

  if (idWrapper === undefined) {
    error(404, `ELI ${params.eli} non trouvé`)
  }
  return { id: idWrapper }
}
