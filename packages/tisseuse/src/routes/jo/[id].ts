import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Jo } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const jo = (
    await db<{ data: Jo }[]>`
    SELECT data FROM jo
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (jo === undefined) {
    return { status: 404 }
  }
  return {
    body: { jo: jo as unknown as JSONObject },
  }
}
