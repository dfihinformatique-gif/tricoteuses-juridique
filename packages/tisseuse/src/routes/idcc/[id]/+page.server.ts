import { error } from "@sveltejs/kit"

import type { Idcc } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const idcc = (
    await db<{ data: Idcc }[]>`
    SELECT data FROM idcc
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (idcc === undefined) {
    throw error(404, `IDCC ${params.id} non trouvé`)
  }
  return { idcc }
}
