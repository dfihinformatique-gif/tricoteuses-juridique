import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { SectionTa } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const sectionTa = (
    await db<{ data: SectionTa }[]>`
    SELECT data FROM section_ta
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (sectionTa === undefined) {
    return { status: 404 }
  }
  return {
    body: { section_ta: sectionTa as unknown as JSONObject },
  }
}
