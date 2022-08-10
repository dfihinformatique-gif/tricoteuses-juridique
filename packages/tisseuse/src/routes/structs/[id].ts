import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Struct } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params, url }) => {
  const struct = (
    await db<{ data: Struct }[]>`
    SELECT data FROM structs
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (struct === undefined) {
    return { status: 404 }
  }
  return { body: { struct: struct as unknown as JSONObject } }
}
