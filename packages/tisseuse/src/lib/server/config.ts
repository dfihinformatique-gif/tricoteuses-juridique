import "dotenv/config"

import { validateConfig } from "$lib/server/auditors/config"

export interface Config {
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
}

const config = {
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
}

const [validConfig, error] = validateConfig(config) as [Config, unknown]
if (error !== null) {
  console.error(
    `Error in server configuration:\n${JSON.stringify(
      validConfig,
      null,
      2,
    )}\nError:\n${JSON.stringify(error, null, 2)}`,
  )
  process.exit(-1)
}
export default validConfig
