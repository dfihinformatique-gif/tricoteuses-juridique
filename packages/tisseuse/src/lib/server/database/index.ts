import assert from "assert"
import postgres from "postgres"

import config from "$lib/server/config"

export interface Version {
  number: number
}

export const db = postgres({
  database: config.db.database,
  host: config.db.host,
  password: config.db.password,
  port: config.db.port,
  user: config.db.user,
})
export const versionNumber = 4

/// Check that database exists and is up to date.
export async function checkDb(): Promise<void> {
  assert(
    (
      await db`SELECT EXISTS (
        SELECT * FROM information_schema.tables WHERE table_name='version'
      )`
    )[0]?.exists,
    'Database is not initialized. Run "npm run configure" to do it.',
  )
  const version = (await db<Version[]>`SELECT * FROM version`)[0]
  assert.notStrictEqual(
    version,
    undefined,
    'Database has no version number. Run "npm run configure" to do it.',
  )
  assert(version.number <= versionNumber, "Database format is too recent.")
  assert.strictEqual(
    version.number,
    versionNumber,
    'Database must be upgraded. Run "npm run configure" to do it.',
  )
}
