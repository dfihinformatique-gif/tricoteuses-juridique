import assert from "node:assert"
import postgres from "postgres"

import config from "$lib/server/config.js"

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

export const legiAnomaliesDb = postgres({
  database: config.legiAnomaliesDb.database,
  host: config.legiAnomaliesDb.host,
  password: config.legiAnomaliesDb.password,
  port: config.legiAnomaliesDb.port,
  user: config.legiAnomaliesDb.user,
})
export const legiAnomaliesVersionNumber = 1

export const legiDb = postgres({
  database: config.legiDb.database,
  host: config.legiDb.host,
  password: config.legiDb.password,
  port: config.legiDb.port,
  user: config.legiDb.user,
})
export const legiVersionNumber = 19

export const tisseuseDb = postgres({
  database: config.tisseuseDb.database,
  host: config.tisseuseDb.host,
  password: config.tisseuseDb.password,
  port: config.tisseuseDb.port,
  user: config.tisseuseDb.user,
})
export const tisseuseVersionNumber = 2

/**
 * Check that assemblee database exists and is up to date.
 */
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

/**
 * Check that legi_anomalies database exists and is up to date.
 */
export async function checkLegiAnomaliesDb(): Promise<void> {
  assert(
    (
      await legiAnomaliesDb`SELECT EXISTS (
        SELECT * FROM information_schema.tables WHERE table_name='version'
      )`
    )[0]?.exists,
    'Legi Anomalies database is not initialized. Run "npm run configure" to do it.',
  )
  const version = (await legiAnomaliesDb<Version[]>`SELECT * FROM version`)[0]
  assert.notStrictEqual(
    version,
    undefined,
    'Legi Anomalies database has no version number. Run "npm run configure" to do it.',
  )
  assert(
    version.number <= legiAnomaliesVersionNumber,
    "Legi Anomalies database format is too recent.",
  )
  assert.strictEqual(
    version.number,
    legiVersionNumber,
    'Legi Anomalies database must be upgraded. Run "npm run configure" to do it.',
  )
}

/**
 * Check that legi database exists and is up to date.
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
