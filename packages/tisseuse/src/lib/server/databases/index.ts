import assert from "assert"
import postgres from "postgres"

import config from "$lib/server/config"

export interface Version {
  number: number
}

export const assembleeDb = postgres({
  database: config.assembleeDb.database,
  host: config.assembleeDb.host,
  password: config.assembleeDb.password,
  port: config.assembleeDb.port,
  user: config.assembleeDb.user,
})
export const assembleeVersionNumber = 7

export const db = postgres({
  database: config.db.database,
  host: config.db.host,
  password: config.db.password,
  port: config.db.port,
  user: config.db.user,
})
export const versionNumber = 8

/// Check that assemblee database exists and is up to date.
export async function checkAssembleeDb(): Promise<void> {
  assert(
    (
      await assembleeDb`SELECT EXISTS (
        SELECT * FROM information_schema.tables WHERE table_name='version'
      )`
    )[0]?.exists,
    "Assemblee database is not initialized.",
  )
  const version = (await assembleeDb<Version[]>`SELECT * FROM version`)[0]
  assert.notStrictEqual(
    version,
    undefined,
    "Assemblee database has no version number.",
  )
  assert(
    version.number <= assembleeVersionNumber,
    "Assemblee database format is too recent.",
  )
  assert.strictEqual(
    version.number,
    assembleeVersionNumber,
    "Assemblee database must be upgraded.",
  )
}

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
