import { error } from "@sveltejs/kit"

import { getDataServiceById } from "$lib/data/tricoteuses-ecosystem.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
	const service = getDataServiceById(params.slug)

	if (service === undefined) {
		throw error(404, {
			message: `Le service "${params.slug}" n'existe pas`,
		})
	}

	return {
		service,
	}
}
