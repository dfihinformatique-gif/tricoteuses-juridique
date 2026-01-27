import { error } from "@sveltejs/kit"

import { externalProjects } from "$lib/data/tricoteuses-ecosystem.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const project = externalProjects.find((p) => p.id === params.slug)

  if (project === undefined) {
    throw error(404, {
      message: `Le projet externe "${params.slug}" n'existe pas`,
    })
  }

  return {
    project,
  }
}
