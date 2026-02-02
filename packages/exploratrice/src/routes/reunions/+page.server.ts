import { getAllTricoteusesMeetings } from "$lib/server/grist.js"
import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async () => {
  const meetings = await getAllTricoteusesMeetings()

  return {
    meetings,
  }
}
