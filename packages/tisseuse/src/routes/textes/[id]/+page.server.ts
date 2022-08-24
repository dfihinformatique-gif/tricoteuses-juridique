import { doGetTexte } from "$lib/server/doers/textes"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, url }) => {
  return (await doGetTexte(params.id, url)) ?? {}
}
