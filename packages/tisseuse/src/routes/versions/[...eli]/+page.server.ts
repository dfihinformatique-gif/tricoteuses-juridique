import { error } from "@sveltejs/kit"

import type { VersionsWrapper } from "$lib/legal"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const versionsWrapper = (
    await db<{ data: VersionsWrapper }[]>`
    SELECT eli, id, data FROM versions
    WHERE eli = ${params.eli}
  `
  )[0]

  if (versionsWrapper === undefined) {
    error(404, `Versions ${params.eli} non trouvé`)
  }
  return { versions: versionsWrapper }
}
