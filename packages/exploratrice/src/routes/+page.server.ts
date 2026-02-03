import { generateHomeOpenGraph } from "$lib/opengraph.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ url }) => {
  const baseUrl = `${url.origin}${url.pathname}`
  const ogMetadata = generateHomeOpenGraph(baseUrl)

  return {
    ogMetadata,
  }
}
