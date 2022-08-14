import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { TexteVersion } from "$lib/legal"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const texteVersion = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (texteVersion === undefined) {
    return { status: 404 }
  }
  return {
    body: { texte_version: texteVersion as unknown as JSONObject },
  }
}
