import {
  getAllTricoteusesMeetings,
  getNextTricoteusesMeeting,
} from "$lib/server/grist.js"
import { generateMeetingsListOpenGraph } from "$lib/opengraph.js"
import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ url }) => {
  const meetings = await getAllTricoteusesMeetings()
  const nextMeeting = await getNextTricoteusesMeeting()

  const baseUrl = `${url.origin}${url.pathname}`
  const ogMetadata = generateMeetingsListOpenGraph(
    nextMeeting ?? undefined,
    baseUrl,
  )

  return {
    meetings,
    nextMeeting,
    ogMetadata,
  }
}
