import { error } from "@sveltejs/kit"

import type { TexteVersion } from "$lib/legal"
import { db } from "$lib/server/database"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const texteVersion = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (texteVersion === undefined) {
    throw error(404, `Texte version ${params.id} non trouvé`)
  }
  return { texte_version: texteVersion }
}
