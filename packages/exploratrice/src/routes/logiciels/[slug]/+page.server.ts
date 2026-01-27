import { error } from "@sveltejs/kit"

import { software } from "$lib/data/tricoteuses-ecosystem.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const softwareItem = software.find((s) => s.id === params.slug)

  if (softwareItem === undefined) {
    throw error(404, {
      message: `Le logiciel "${params.slug}" n'existe pas`,
    })
  }

  return {
    software: softwareItem,
  }
}
