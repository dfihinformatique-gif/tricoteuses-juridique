import {
  getAllTricoteusesMeetings,
  getNextTricoteusesMeeting,
} from "$lib/server/grist.js"
import { generateMeetingsListOpenGraph } from "$lib/opengraph.js"
import { isMeetingEnded } from "$lib/meetings.js"
import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ url }) => {
  const allMeetings = await getAllTricoteusesMeetings()
  const nextMeeting = await getNextTricoteusesMeeting()

  // Filtrer les réunions côté serveur (utilise l'heure du serveur, même timezone que Grist)
  const upcomingMeetings = allMeetings.filter(
    (meeting) => !isMeetingEnded(meeting),
  )
  const pastMeetings = allMeetings.filter((meeting) => isMeetingEnded(meeting))

  const baseUrl = `${url.origin}${url.pathname}`
  const ogMetadata = generateMeetingsListOpenGraph(
    nextMeeting ?? undefined,
    baseUrl,
  )

  return {
    upcomingMeetings,
    pastMeetings,
    nextMeeting,
    ogMetadata,
  }
}
