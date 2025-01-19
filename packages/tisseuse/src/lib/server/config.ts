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
  forgejo?: {
    sshAccount: string
    sshPort: number
    token: string
    url: string
  }
  title: string
  url: string
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
  forgejo:
    process.env.FORGEJO_URL == null
      ? undefined
      : {
          sshAccount: process.env.FORGEJO_SSH_ACCOUNT,
          sshPort: process.env.FORGEJO_SSH_PORT,
          token: process.env.FORGEJO_TOKEN,
          url: process.env.FORGEJO_URL,
        },
  title: process.env.TITLE,
  url: process.env.URL,
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
