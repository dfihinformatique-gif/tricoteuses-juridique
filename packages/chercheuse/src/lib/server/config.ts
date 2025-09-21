import "dotenv/config"

import { validateConfig } from "$lib/server/auditors/config.js"

export interface Config {
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
