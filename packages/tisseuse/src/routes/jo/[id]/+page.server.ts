import { error } from "@sveltejs/kit"

import type { Jo } from "$lib/legal/jorf.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const jo = (
    await db<{ data: Jo }[]>`
    SELECT data FROM jo
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (jo === undefined) {
    error(404, `JO ${params.id} non trouvé`)
  }
  return { jo }
}
