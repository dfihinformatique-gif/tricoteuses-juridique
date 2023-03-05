import { error } from "@sveltejs/kit"

import type { Jo } from "$lib/legal"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const jo = (
    await db<{ data: Jo }[]>`
    SELECT data FROM jo
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (jo === undefined) {
    throw error(404, `JO ${params.id} non trouvé`)
  }
  return { jo }
}
