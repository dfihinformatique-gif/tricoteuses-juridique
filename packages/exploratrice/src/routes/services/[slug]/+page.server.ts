import { error } from "@sveltejs/kit"

import { dataServices } from "$lib/data/tricoteuses-ecosystem.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const service = dataServices[params.slug]

  if (service === undefined) {
    throw error(404, {
      message: `Le service "${params.slug}" n'existe pas`,
    })
  }

  return {
    service,
  }
}
