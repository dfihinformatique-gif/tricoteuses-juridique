import "dotenv/config"

import { validateConfig } from "$lib/server/auditors/config"

export interface Config {
  assembleeDb: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  title: string
}

const [config, error] = validateConfig({
  assembleeDb: {
    host: process.env.ASSEMBLEE_DB_HOST,
    port: process.env.ASSEMBLEE_DB_PORT,
    database: process.env.ASSEMBLEE_DB_NAME,
    user: process.env.ASSEMBLEE_DB_USER,
    password: process.env.ASSEMBLEE_DB_PASSWORD,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
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
