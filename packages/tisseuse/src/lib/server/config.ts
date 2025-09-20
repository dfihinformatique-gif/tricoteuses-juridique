import "dotenv/config"

import { validateConfig } from "$lib/server/auditors/config.js"

export interface Config {
  assembleeDb: DatabaseConfig
  legiAnomaliesDb: DatabaseConfig
  legiDb: DatabaseConfig
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
