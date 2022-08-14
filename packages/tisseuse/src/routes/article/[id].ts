import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { Article } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const article = (
    await db<{ data: Article }[]>`
    SELECT data FROM article
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (article === undefined) {
    return { status: 404 }
  }
  return {
    body: { article: article as unknown as JSONObject },
  }
}
