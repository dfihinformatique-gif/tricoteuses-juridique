import "dotenv/config"

import { validateConfig } from "$lib/server/auditors/config.js"

export interface Config {
  allowRobots: boolean
  assembleeDb: DatabaseConfig
  assembleeDocumentsDir: string
  legiDb: DatabaseConfig
  tisseuseDb: DatabaseConfig
  title: string
}

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

const [config, error] = validateConfig({
  allowRobots: process.env.ALLOW_ROBOTS,
  assembleeDb: {
    host: process.env.ASSEMBLEE_DB_HOST,
    port: process.env.ASSEMBLEE_DB_PORT,
    database: process.env.ASSEMBLEE_DB_NAME,
    user: process.env.ASSEMBLEE_DB_USER,
    password: process.env.ASSEMBLEE_DB_PASSWORD,
  },
  assembleeDocumentsDir: process.env.ASSEMBLEE_DOCUMENTS_DIR,
  legiDb: {
    host: process.env.LEGI_DB_HOST,
    port: process.env.LEGI_DB_PORT,
    database: process.env.LEGI_DB_NAME,
    user: process.env.LEGI_DB_USER,
    password: process.env.LEGI_DB_PASSWORD,
  },
  tisseuseDb: {
    host: process.env.TISSEUSE_DB_HOST,
    port: process.env.TISSEUSE_DB_PORT,
    database: process.env.TISSEUSE_DB_NAME,
    user: process.env.TISSEUSE_DB_USER,
    password: process.env.TISSEUSE_DB_PASSWORD,
  },
  title: process.env.TITLE,
}) as [Config, unknown]
if (error !== null) {
  console.error(
    `Error in server configuration:\n${JSON.stringify(
      config,
      null,
      2,
    )}\nError:\n${JSON.stringify(error, null, 2)}`,
  )
  process.exit(-1)
}
export default config
