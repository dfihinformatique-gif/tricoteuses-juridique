import config from "$lib/server/config.js"
import { getNextTricoteusesMeeting } from "$lib/server/grist.js"

import type { LayoutServerLoad } from "./$types.js"

export const load: LayoutServerLoad = async ({ url }) => {
  const nextMeeting = await getNextTricoteusesMeeting()

  return {
    appTitle: config.title,
    linkUrlOriginReplacement: config.linkUrlOriginReplacement,
    nextMeeting,
    baseUrl: url.origin + url.pathname,
  }
}
