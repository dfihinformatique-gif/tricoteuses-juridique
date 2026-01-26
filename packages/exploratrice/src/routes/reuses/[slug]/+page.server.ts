import { error } from "@sveltejs/kit"

import { getReuseById } from "$lib/data/tricoteuses-ecosystem.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const reuse = getReuseById(params.slug)

  if (reuse === undefined) {
    throw error(404, {
      message: `La réutilisation "${params.slug}" n'existe pas`,
    })
  }

  return {
    reuse,
  }
}
