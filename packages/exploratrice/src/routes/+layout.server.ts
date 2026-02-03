import privateConfig from "$lib/server/private_config.js"
import publicConfig from "$lib/public_config.js"
import { getNextTricoteusesMeeting } from "$lib/server/grist.js"

import type { LayoutServerLoad } from "./$types.js"

export const load: LayoutServerLoad = async ({ url }) => {
  const nextMeeting = await getNextTricoteusesMeeting()

  return {
    appTitle: publicConfig.title,
    linkUrlOriginReplacement: privateConfig.linkUrlOriginReplacement,
    nextMeeting,
    baseUrl: url.origin + url.pathname,
  }
}
