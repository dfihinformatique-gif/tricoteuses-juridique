import assert from "assert"

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

  if (version.number < 2) {
    await db`ALTER TABLE IF EXISTS articles RENAME TO article`
    await db`DROP TABLE IF EXISTS eli_ids`
    await db`DROP TABLE IF EXISTS eli_versions`
    await db`ALTER TABLE IF EXISTS sections RENAME TO section_ta`
    await db`ALTER TABLE IF EXISTS structs RENAME TO textelr`
    await db`ALTER TABLE IF EXISTS textes RENAME TO texte_version`
  }

  // Types

  // Tables

  // Table: article
  await db`
    CREATE TABLE IF NOT EXISTS article (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // // Table: article_autocompletions
  // await `
  //   CREATE TABLE IF NOT EXISTS article_autocompletions (
  //     autocompletion text NOT NULL,
  //     id bigint NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  //     weight int NOT NULL,
  //     PRIMARY KEY (id, autocompletion)
  //   )
  // `

  // Table: id
  await db`
    CREATE TABLE IF NOT EXISTS id (
      eli text PRIMARY KEY,
      id char(20) NOT NULL
    )
  `

  // Table: jo
  await db`
    CREATE TABLE IF NOT EXISTS jo (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: section_ta
  await db`
    CREATE TABLE IF NOT EXISTS section_ta (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: texte_version
  await db`
    CREATE TABLE IF NOT EXISTS texte_version (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: textelr
  await db`
    CREATE TABLE IF NOT EXISTS textelr (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
    )
  `

  // Table: versions
  await db`
    CREATE TABLE IF NOT EXISTS versions (
      eli text PRIMARY KEY,
      id char(20) NOT NULL,
      data jsonb NOT NULL
    )
  `

  // Apply patches that must be executed after every table is created.

  // Add indexes once every table and column exists.

  // await db`
  //   CREATE INDEX IF NOT EXISTS article_autocompletions_trigrams_idx
  //   ON article_autocompletions
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
