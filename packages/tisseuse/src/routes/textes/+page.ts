import { error } from "@sveltejs/kit"

import type { ListTextesResult } from "$lib/aggregates"

import type { PageLoad } from "./$types"

export const load: PageLoad = async ({ fetch, url }) => {
  const apiUrl = `/api${url.pathname}${url.search}`
  const response = await fetch(apiUrl, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    const text = await response.text()
    console.error(
      `Error in ${url.pathname} while calling ${apiUrl}:\n${response.status} ${response.statusText}\n\n${text}`,
    )
    throw error(response.status, text)
  }
  return (await response.json()) as ListTextesResult
}
