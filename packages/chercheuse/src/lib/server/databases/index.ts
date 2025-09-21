import assert from "node:assert"
import postgres from "postgres"

import config from "$lib/server/config.js"

export interface Version {
  number: number
}

export const tisseuseDb = postgres({
  database: config.tisseuseDb.database,
  host: config.tisseuseDb.host,
  password: config.tisseuseDb.password,
  port: config.tisseuseDb.port,
  user: config.tisseuseDb.user,
})
export const tisseuseVersionNumber = 1

/**
 * Check that Tisseuse database exists and is up to date.
 */
export async function checktisseuseDb(): Promise<void> {
  assert(
    (
      await tisseuseDb`SELECT EXISTS (
        SELECT * FROM information_schema.tables WHERE table_name='version'
      )`
    )[0]?.exists,
    "tisseuse database is not initialized.",
  )
  const version = (await tisseuseDb<Version[]>`SELECT * FROM version`)[0]
  assert.notStrictEqual(
    version,
    undefined,
    "Tisseuse database has no version number.",
  )
  assert(
    version.number <= tisseuseVersionNumber,
    "Tisseuse database format is too recent.",
  )
  assert.strictEqual(
    version.number,
    tisseuseVersionNumber,
    "Tisseuse database must be upgraded.",
  )
}
