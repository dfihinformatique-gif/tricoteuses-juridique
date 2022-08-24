import { doListTextes } from "$lib/server/doers/textes"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ url }) => {
  return (await doListTextes(url)) ?? {}
}
