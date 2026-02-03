import { env } from "$env/dynamic/public"
import {
  validatePublicConfigSafe,
  type PublicConfig,
} from "$lib/zod/public_config.js"

// Re-export types for backward compatibility
export type { PublicConfig }

const result = validatePublicConfigSafe({
  title: env.PUBLIC_TITLE,
})

if (!result.success) {
  console.error(
    `Error in public configuration:\n${JSON.stringify(
      result.error.format(),
      null,
      2,
    )}`,
  )
  throw new Error("Invalid public configuration")
}

const publicConfig = result.data
export default publicConfig
