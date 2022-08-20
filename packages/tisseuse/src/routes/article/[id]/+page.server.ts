import { error } from "@sveltejs/kit"

import type { Article } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const article = (
    await db<{ data: Article }[]>`
    SELECT data FROM article
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (article === undefined) {
    throw error(404, `Article ${params.id} non trouvé`)
  }
  return { article }
}
