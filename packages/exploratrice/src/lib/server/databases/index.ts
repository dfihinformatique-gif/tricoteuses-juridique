import assert from "node:assert"
import postgres from "postgres"

import privateConfig from "$lib/server/private_config.js"

export interface Version {
  number: number
}

export const assembleeDb = postgres({
  database: privateConfig.assembleeDb.database,
  host: privateConfig.assembleeDb.host,
  port: privateConfig.assembleeDb.port,
  user: privateConfig.assembleeDb.user,
  password: privateConfig.assembleeDb.password,
})
export const assembleeVersionNumber = 9

export const legiDb = postgres({
  database: privateConfig.legiDb.database,
  host: privateConfig.legiDb.host,
  port: privateConfig.legiDb.port,
  user: privateConfig.legiDb.user,
  password: privateConfig.legiDb.password,
})
export const legiVersionNumber = 20

export const tisseuseDb = postgres({
  database: privateConfig.tisseuseDb.database,
  host: privateConfig.tisseuseDb.host,
  port: privateConfig.tisseuseDb.port,
  user: privateConfig.tisseuseDb.user,
  password: privateConfig.tisseuseDb.password,
})
export const tisseuseVersionNumber = 3

/**
 * Check that Legi database exists and is up to date.
 */
export async function checkLegiDb(): Promise<void> {
  assert(
    (
      await legiDb`SELECT EXISTS (
        SELECT * FROM information_schema.tables WHERE table_name='version'
      )`
    )[0]?.exists,
    'Legi database is not initialized. Run "npm run configure" to do it.',
  )
  const version = (await legiDb<Version[]>`SELECT * FROM version`)[0]
  assert.notStrictEqual(
    version,
    undefined,
    'Legi database has no version number. Run "npm run configure" to do it.',
  )
  assert(
    version.number <= legiVersionNumber,
    "Legi database format is too recent.",
  )
  assert.strictEqual(
    version.number,
    legiVersionNumber,
    'Legi database must be upgraded. Run "npm run configure" to do it.',
  )
}

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
