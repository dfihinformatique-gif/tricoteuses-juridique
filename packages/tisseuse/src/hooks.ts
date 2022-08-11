import type { GetSession, Handle } from "@sveltejs/kit"

import config from "$lib/server/config"

export const getSession: GetSession = async () => {
  return {
    title: config.title,
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const { request } = event
  if (request.method === "OPTIONS") {
    const headers: { [name: string]: string } = {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    }
    const vary: string[] = []
    const allowedHeaders =
      request.headers
        .get("Access-Control-Request-Headers")
        ?.split(",")
        .map((name) => name.trim()) ?? []
    if (allowedHeaders.length > 0) {
      vary.push("Access-Control-Request-Headers")
      headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ")
    }

    if (vary.length > 0) {
      headers["Vary"] = vary.join(", ")
    }
    return new Response(null, { status: 204, headers })
  }

  return await resolve(event)
}
