import "dotenv/config"

import { LinkType } from "$lib/links"
import { validateConfig } from "$lib/server/auditors/config.js"

export interface Config {
  assembleeDb: DatabaseConfig
  europeDb: DatabaseConfig
  legiAnomaliesDb: DatabaseConfig
  legiDb: DatabaseConfig
  linkBaseUrl: string
  linkType: LinkType
  tisseuseDb: DatabaseConfig
}

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

const [config, error] = validateConfig({
  assembleeDb: {
    host: process.env.ASSEMBLEE_DB_HOST,
    port: process.env.ASSEMBLEE_DB_PORT,
    database: process.env.ASSEMBLEE_DB_NAME,
    user: process.env.ASSEMBLEE_DB_USER,
    password: process.env.ASSEMBLEE_DB_PASSWORD,
  },
  europeDb: {
    host: process.env.EUROPE_DB_HOST,
    port: process.env.EUROPE_DB_PORT,
    database: process.env.EUROPE_DB_NAME,
    user: process.env.EUROPE_DB_USER,
    password: process.env.EUROPE_DB_PASSWORD,
  },
  legiAnomaliesDb: {
    host: process.env.LEGI_ANOMALIES_DB_HOST,
    port: process.env.LEGI_ANOMALIES_DB_PORT,
    database: process.env.LEGI_ANOMALIES_DB_NAME,
    user: process.env.LEGI_ANOMALIES_DB_USER,
    password: process.env.LEGI_ANOMALIES_DB_PASSWORD,
  },
  legiDb: {
    host: process.env.LEGI_DB_HOST,
    port: process.env.LEGI_DB_PORT,
    database: process.env.LEGI_DB_NAME,
    user: process.env.LEGI_DB_USER,
    password: process.env.LEGI_DB_PASSWORD,
  },
  linkBaseUrl: process.env.LINK_BASE_URL,
  linkType: process.env.LINK_TYPE,
  tisseuseDb: {
    host: process.env.TISSEUSE_DB_HOST,
    port: process.env.TISSEUSE_DB_PORT,
    database: process.env.TISSEUSE_DB_NAME,
    user: process.env.TISSEUSE_DB_USER,
    password: process.env.TISSEUSE_DB_PASSWORD,
  },
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
