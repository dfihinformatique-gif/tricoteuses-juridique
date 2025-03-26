import { error } from "@sveltejs/kit"

import type { GetRechercheResult } from "$lib/aggregates.js"

import type { PageLoad } from "./$types.js"

export const load: PageLoad = async ({ fetch, url }) => {
  const apiUrl = `/api${url.pathname}`
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    const text = await response.text()
    console.error(
      `Error in ${url.pathname} while calling ${apiUrl}:\n${response.status} ${response.statusText}\n\n${text}`,
    )
    error(response.status, text)
  }
  return (await response.json()) as GetRechercheResult
}
