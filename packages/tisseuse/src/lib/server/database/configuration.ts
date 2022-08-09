import assert from "assert"
import dedent from "dedent-js"

import { db, type Version, versionNumber } from "$lib/server/database"

export async function configureDatabase() {
  // Table: version
  await db`
    CREATE TABLE IF NOT EXISTS version(
      number integer NOT NULL
    )
  `
  let version = (await db<Version[]>`SELECT * FROM version`)[0]
  if (version === undefined) {
    version = (
      await db<Version[]>`
        INSERT INTO version (number)
        VALUES (${versionNumber})
        RETURNING *
      `
    )[0]
  } else if (version.number === undefined) {
    version = { number: 0 }
  }
  assert(
    version.number <= versionNumber,
    `Database is too recent for current version of application: ${version.number} > ${versionNumber}.`,
  )
  if (version.number < versionNumber) {
    console.log(
      `Upgrading database from version ${version.number} to ${versionNumber}…`,
    )
  }

  // Apply patches that must be executed before every table is created.

  // Types

  // Tables

  // Table: articles
  await db`
    CREATE TABLE IF NOT EXISTS articles (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // // Table: articles_autocompletions
  // await `
  //   CREATE TABLE IF NOT EXISTS articles_autocompletions (
  //     autocompletion text NOT NULL,
  //     id bigint NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  //     weight int NOT NULL,
  //     PRIMARY KEY (id, autocompletion)
  //   )
  // `

  // Table: eli_ids
  await db`
    CREATE TABLE IF NOT EXISTS eli_ids (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: eli_versions
  await db`
    CREATE TABLE IF NOT EXISTS eli_versions (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: sections
  await db`
    CREATE TABLE IF NOT EXISTS sections (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: structs
  await db`
    CREATE TABLE IF NOT EXISTS structs (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: versions
  await db`
    CREATE TABLE IF NOT EXISTS versions (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Apply patches that must be executed after every table is created.

  // Add indexes once every table and column exists.

  // await db`
  //   CREATE INDEX IF NOT EXISTS articles_autocompletions_trigrams_idx
  //   ON articles_autocompletions
  //   USING GIST (autocompletion gist_trgm_ops)
  // `

  // Add comments once every table and column exists.

  // Upgrade version number if needed.

  const previousVersionNumber = version.number

  version.number = versionNumber
  assert(
    version.number >= previousVersionNumber,
    `Error in database upgrade script: Wrong version number: ${version.number} < ${previousVersionNumber}.`,
  )
  if (version.number !== previousVersionNumber) {
    await db`UPDATE version SET number = ${version.number}`
    console.log(
      `Upgraded database from version ${previousVersionNumber} to ${version.number}.`,
    )
  }
}
