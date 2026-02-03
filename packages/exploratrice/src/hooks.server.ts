import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { paraglideMiddleware } from "$lib/paraglide/server"
import privateConfig from "$lib/server/private_config.js"
import { deLocalizeUrl } from "$lib/paraglide/runtime"

// HTTP Basic Auth middleware for admin routes
const handleAdminAuth: Handle = async ({ event, resolve }) => {
  const delocalizedPath = deLocalizeUrl(event.url).pathname

  // Check if this is an admin route
  if (delocalizedPath.startsWith("/admin")) {
    const authHeader = event.request.headers.get("authorization")

    let isAuthorized = false

    if (authHeader && authHeader.startsWith("Basic ")) {
      const base64Credentials = authHeader.slice(6)
      const credentials = Buffer.from(base64Credentials, "base64").toString(
        "utf-8",
      )
      const [username, password] = credentials.split(":")

      isAuthorized =
        username === privateConfig.admin.username &&
        password === privateConfig.admin.password
    }

    if (!isAuthorized) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Admin Area", charset="UTF-8"',
        },
      })
    }
  }

  return resolve(event)
}

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
  const link = response.headers.get("Link")
  if (link != null && link.length > 3700) {
    response.headers.delete("link")
  }

  return response
}

export const handle: Handle = sequence(
  handleAdminAuth,
  handleParaglide,
  handleRemoveLinkHeaders,
)
