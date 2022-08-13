import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { IdWrapper } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const idWrapper = (
    await db<{ data: IdWrapper }[]>`
    SELECT eli, id FROM id
    WHERE eli = ${params.eli}
  `
  )[0]

  if (idWrapper === undefined) {
    return { headers: { "Access-Control-Allow-Origin": "*" }, status: 404 }
  }
  return {
    headers: { "Access-Control-Allow-Origin": "*" },
    body: { id: idWrapper as unknown as JSONObject },
  }
}
