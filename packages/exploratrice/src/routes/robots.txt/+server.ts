import type { RequestHandler } from "@sveltejs/kit"
import dedent from "dedent-js"

import config from "$lib/server/config"

const { allowRobots } = config

export const GET: RequestHandler = async () => {
  return new Response(
    dedent`
      # https://www.robotstxt.org/robotstxt.html
      User-agent: *
      Disallow:${allowRobots ? "" : " /"}
    `,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  )
}
