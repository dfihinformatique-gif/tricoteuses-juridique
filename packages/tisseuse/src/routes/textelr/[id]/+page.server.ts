import { error } from "@sveltejs/kit"

import type { Textelr } from "$lib/legal/index.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const textelr = (
    await db<{ data: Textelr }[]>`
    SELECT data FROM textelr
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textelr === undefined) {
    error(404, `TEXTELR ${params.id} non trouvé`)
  }
  return { textelr: textelr }
}
