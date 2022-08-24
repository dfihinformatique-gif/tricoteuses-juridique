import { error } from "@sveltejs/kit"

import type { Textekali } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const textekali = (
    await db<{ data: Textekali }[]>`
    SELECT data FROM textekali
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textekali === undefined) {
    throw error(404, `TEXTEKALI ${params.id} non trouvé`)
  }
  return { textekali }
}
