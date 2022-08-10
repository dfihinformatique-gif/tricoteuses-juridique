import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { TexteVersion } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params, url }) => {
  const texte = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM textes_versions
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (texte === undefined) {
    return { status: 404 }
  }
  return { body: { texte: texte as unknown as JSONObject } }
}
