import { db } from "$lib/server/databases/index.js"

import type { RequestHandler } from "./$types.js"

export const GET: RequestHandler = async () => {
  const natures = (
    await db<{ nature: string }[]>`
      SELECT distinct nature
      FROM texte_version
      ORDER BY nature
    `
  ).map(({ nature }) => nature)
  return new Response(
    JSON.stringify(
      {
        natures,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  )
}
