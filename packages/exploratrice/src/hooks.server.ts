import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { paraglideMiddleware } from "$lib/paraglide/server"

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace("%paraglide.lang%", locale),
    })
  })

// Hook to remove Link headers that cause the Nginx error
// "upstream sent too big header" because they are too large
const handleRemoveLinkHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  // Remove the Link header when it is too long to avoid exceeding
  // the Nginx header size limit.
  // These headers are used for module preloading but can become very long.
  const link = response.headers.get('Link')
  if (link != null && link.length > 3700) {
    response.headers.delete("link")
  }

  return response
}

export const handle: Handle = sequence(handleParaglide, handleRemoveLinkHeaders)
