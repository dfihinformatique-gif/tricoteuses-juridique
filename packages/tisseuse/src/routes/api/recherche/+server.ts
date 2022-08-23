import { doGetRecherche } from "$lib/server/doers/recherche"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async ({ url }) => {
  const result = await doGetRecherche(url)
  return result === null
    ? new Response(null, { status: 204 })
    : new Response(JSON.stringify(result, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      })
}
