import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Textekali } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const textekali = (
    await db<{ data: Textekali }[]>`
    SELECT data FROM textekali
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (textekali === undefined) {
    return { status: 404 }
  }
  return {
    body: { textekali: textekali as unknown as JSONObject },
  }
}
