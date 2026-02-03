import { env } from "$env/dynamic/private"
import {
  validatePrivateConfigSafe,
  type PrivateConfig,
  type DatabasePrivateConfig,
} from "$lib/zod/private_config.js"

// Re-export types for backward compatibility
export type { PrivateConfig, DatabasePrivateConfig }

const result = validatePrivateConfigSafe({
  allowRobots: env.ALLOW_ROBOTS,
  assembleeDb: {
    host: env.ASSEMBLEE_DB_HOST,
    port: env.ASSEMBLEE_DB_PORT,
    database: env.ASSEMBLEE_DB_NAME,
    user: env.ASSEMBLEE_DB_USER,
    password: env.ASSEMBLEE_DB_PASSWORD,
  },
  assembleeDocumentsDir: env.ASSEMBLEE_DOCUMENTS_DIR,
  grist: {
    apiKey: env.GRIST_API_KEY,
    docId: env.GRIST_DOC_ID,
    instanceUrl: env.GRIST_INSTANCE_URL,
    cacheTtlMinutes: env.GRIST_CACHE_TTL_MINUTES,
  },
  admin: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  },
  legiDb: {
    host: env.LEGI_DB_HOST,
    port: env.LEGI_DB_PORT,
    database: env.LEGI_DB_NAME,
    user: env.LEGI_DB_USER,
    password: env.LEGI_DB_PASSWORD,
  },
  linkUrlOriginReplacement: env.LINK_URL_ORIGIN_REPLACEMENT,
  tisseuseDb: {
    host: env.TISSEUSE_DB_HOST,
    port: env.TISSEUSE_DB_PORT,
    database: env.TISSEUSE_DB_NAME,
    user: env.TISSEUSE_DB_USER,
    password: env.TISSEUSE_DB_PASSWORD,
  },
})

if (!result.success) {
  console.error(
    `Error in server configuration:\n${JSON.stringify(
      result.error.format(),
      null,
      2,
    )}`,
  )
  process.exit(-1)
}

const privateConfig = result.data
export default privateConfig
