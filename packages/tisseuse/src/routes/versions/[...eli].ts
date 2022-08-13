import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { VersionsWrapper } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const versionsWrapper = (
    await db<{ data: VersionsWrapper }[]>`
    SELECT eli, id, data FROM versions
    WHERE eli = ${params.eli}
  `
  )[0]

  if (versionsWrapper === undefined) {
    return { headers: { "Access-Control-Allow-Origin": "*" }, status: 404 }
  }
  return {
    headers: { "Access-Control-Allow-Origin": "*" },
    body: { versions: versionsWrapper as unknown as JSONObject },
  }
}
