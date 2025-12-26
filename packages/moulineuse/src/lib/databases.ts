import postgres from "postgres"
import config from "./config.js"

export const assembleeDb = postgres({
  database: config.assembleeDb.database,
  host: config.assembleeDb.host,
  password: config.assembleeDb.password,
  port: config.assembleeDb.port,
  user: config.assembleeDb.user,
})

export const legiDb = postgres({
  database: config.legiDb.database,
  host: config.legiDb.host,
  password: config.legiDb.password,
  port: config.legiDb.port,
  user: config.legiDb.user,
})

/**
 * Close all database connections
 */
export async function closeConnections(): Promise<void> {
  await assembleeDb.end()
  await legiDb.end()
}
