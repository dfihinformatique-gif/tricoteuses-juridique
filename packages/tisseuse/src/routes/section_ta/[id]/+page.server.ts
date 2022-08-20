import { error } from "@sveltejs/kit"

import type { SectionTa } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const sectionTa = (
    await db<{ data: SectionTa }[]>`
    SELECT data FROM section_ta
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (sectionTa === undefined) {
    throw error(404, `Section TA ${params.id} non trouvée`)
  }
  return { section_ta: sectionTa }
}
