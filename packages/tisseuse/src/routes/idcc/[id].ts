import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Idcc } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const idcc = (
    await db<{ data: Idcc }[]>`
    SELECT data FROM idcc
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (idcc === undefined) {
    return { headers: { "Access-Control-Allow-Origin": "*" }, status: 404 }
  }
  return {
    headers: { "Access-Control-Allow-Origin": "*" },
    body: { idcc: idcc as unknown as JSONObject },
  }
}
