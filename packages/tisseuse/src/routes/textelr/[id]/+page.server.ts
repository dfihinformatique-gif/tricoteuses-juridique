import { error } from "@sveltejs/kit"

import type { Textelr } from "$lib/legal"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const textelr = (
    await db<{ data: Textelr }[]>`
    SELECT data FROM textelr
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textelr === undefined) {
    throw error(404, `TEXTELR ${params.id} non trouvé`)
  }
  return { textelr: textelr }
}
