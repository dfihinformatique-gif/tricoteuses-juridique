import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Textelr } from "$lib/legal"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const textelr = (
    await db<{ data: Textelr }[]>`
    SELECT data FROM textelr
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textelr === undefined) {
    return { status: 404 }
  }
  return {
    body: { textelr: textelr as unknown as JSONObject },
  }
}
