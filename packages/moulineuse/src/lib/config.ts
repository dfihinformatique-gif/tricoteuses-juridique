import "dotenv/config"
import { z } from "zod"

const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(0).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
})

const ConfigSchema = z.object({
  assembleeDb: DatabaseConfigSchema,
  legiDb: DatabaseConfigSchema,
})

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
export type Config = z.infer<typeof ConfigSchema>

const rawConfig = {
  assembleeDb: {
    host: process.env.ASSEMBLEE_DB_HOST,
    port: Number(process.env.ASSEMBLEE_DB_PORT),
    database: process.env.ASSEMBLEE_DB_NAME,
    user: process.env.ASSEMBLEE_DB_USER,
    password: process.env.ASSEMBLEE_DB_PASSWORD,
  },
  legiDb: {
    host: process.env.LEGI_DB_HOST,
    port: Number(process.env.LEGI_DB_PORT),
    database: process.env.LEGI_DB_NAME,
    user: process.env.LEGI_DB_USER,
    password: process.env.LEGI_DB_PASSWORD,
  },
}

let config: Config
try {
  config = ConfigSchema.parse(rawConfig)
} catch (error) {
  console.error(
    `Error in server configuration:\n${JSON.stringify(
      rawConfig,
      null,
      2,
    )}\nError:\n${error}`,
  )
  process.exit(1)
}

export default config
