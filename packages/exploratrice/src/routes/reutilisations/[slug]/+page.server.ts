import { error } from "@sveltejs/kit"

import { reuses } from "$lib/data/tricoteuses-ecosystem.js"
import { generateReuseOpenGraph } from "$lib/opengraph.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, url }) => {
  const reuse = reuses[params.slug]

  if (reuse === undefined) {
    throw error(404, {
      message: `La réutilisation "${params.slug}" n'existe pas`,
    })
  }

  const baseUrl = `${url.origin}${url.pathname}`
  const ogMetadata = generateReuseOpenGraph(reuse, baseUrl)

  return {
    reuse,
    ogMetadata,
  }
}
