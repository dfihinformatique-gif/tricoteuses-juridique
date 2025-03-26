import { error } from "@sveltejs/kit"

import type { Idcc } from "$lib/legal/index.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const idcc = (
    await db<{ data: Idcc }[]>`
    SELECT data FROM idcc
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (idcc === undefined) {
    error(404, `IDCC ${params.id} non trouvé`)
  }
  return { idcc }
}
