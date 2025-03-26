import config from "$lib/server/config.js"

import type { LayoutServerLoad } from "./$types.js"

export const load: LayoutServerLoad = () => {
  return { appTitle: config.title }
}
