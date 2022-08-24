import { doGetTexte } from "$lib/server/doers/textes"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ params, url }) => {
  const result = await doGetTexte(params.id, url)
  return new Response(JSON.stringify(result, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}
