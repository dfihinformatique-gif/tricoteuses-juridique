import { doGetRecherche } from "$lib/server/doers/recherche"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url }) => {
  return (await doGetRecherche(url)) ?? {}
}
