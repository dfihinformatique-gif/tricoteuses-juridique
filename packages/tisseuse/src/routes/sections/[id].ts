import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Section } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params, url }) => {
  const section = (
    await db<{ data: Section }[]>`
    SELECT data FROM sections
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (section === undefined) {
    return { headers: { "Access-Control-Allow-Origin": "*" }, status: 404 }
  }
  return {
    headers: { "Access-Control-Allow-Origin": "*" },
    body: { section: section as unknown as JSONObject },
  }
}
