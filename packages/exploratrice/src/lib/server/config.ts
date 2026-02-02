import "dotenv/config"

import {
  validateConfigSafe,
  type Config,
  type DatabaseConfig,
} from "$lib/zod/config.js"

// Re-export types for backward compatibility
export type { Config, DatabaseConfig }

const result = validateConfigSafe({
  allowRobots: process.env.ALLOW_ROBOTS,
  assembleeDb: {
    host: process.env.ASSEMBLEE_DB_HOST,
    port: process.env.ASSEMBLEE_DB_PORT,
    database: process.env.ASSEMBLEE_DB_NAME,
    user: process.env.ASSEMBLEE_DB_USER,
    password: process.env.ASSEMBLEE_DB_PASSWORD,
  },
  assembleeDocumentsDir: process.env.ASSEMBLEE_DOCUMENTS_DIR,
  grist: {
    apiKey: process.env.GRIST_API_KEY,
    docId: process.env.GRIST_DOC_ID,
    instanceUrl: process.env.GRIST_INSTANCE_URL,
  },
  legiDb: {
    host: process.env.LEGI_DB_HOST,
    port: process.env.LEGI_DB_PORT,
    database: process.env.LEGI_DB_NAME,
    user: process.env.LEGI_DB_USER,
    password: process.env.LEGI_DB_PASSWORD,
  },
  linkUrlOriginReplacement: process.env.LINK_URL_ORIGIN_REPLACEMENT,
  tisseuseDb: {
    host: process.env.TISSEUSE_DB_HOST,
    port: process.env.TISSEUSE_DB_PORT,
    database: process.env.TISSEUSE_DB_NAME,
    user: process.env.TISSEUSE_DB_USER,
    password: process.env.TISSEUSE_DB_PASSWORD,
  },
  title: process.env.TITLE,
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

const config = result.data
export default config
