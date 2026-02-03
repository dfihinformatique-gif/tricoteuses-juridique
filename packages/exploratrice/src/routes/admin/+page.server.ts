import { clearCache } from "$lib/server/cache.js"
import { fail } from "@sveltejs/kit"
import type { Actions } from "./$types.js"

// Note: Authentication is handled in hooks.server.ts
// All admin routes are protected by HTTP Basic Auth

export const actions = {
  clearCache: async () => {
    try {
      await clearCache()
      return { success: true, message: "Cache vidé avec succès" }
    } catch (error) {
      console.error("Failed to clear cache:", error)
      return fail(500, {
        success: false,
        message: "Erreur lors du vidage du cache",
      })
    }
  },
} satisfies Actions
