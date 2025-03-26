import { error } from "@sveltejs/kit"

import type { Textekali } from "$lib/legal/index.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const textekali = (
    await db<{ data: Textekali }[]>`
    SELECT data FROM textekali
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textekali === undefined) {
    error(404, `TEXTEKALI ${params.id} non trouvé`)
  }
  return { textekali }
}
