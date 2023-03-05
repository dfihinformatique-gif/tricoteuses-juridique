import { error } from "@sveltejs/kit"

import type { IdWrapper } from "$lib/legal"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const idWrapper = (
    await db<{ data: IdWrapper }[]>`
    SELECT eli, id FROM id
    WHERE eli = ${params.eli}
  `
  )[0]

  if (idWrapper === undefined) {
    throw error(404, `ELI ${params.eli} non trouvé`)
  }
  return { id: idWrapper }
}
