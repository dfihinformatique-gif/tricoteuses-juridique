import assert from "assert"

import {
  tisseuseDb,
  tisseuseVersionNumber as versionNumber,
  type Version,
} from "./index.js"

export async function configureTisseuseDatabase() {
  // Table: version
  await tisseuseDb`
    CREATE TABLE IF NOT EXISTS version(
      number integer NOT NULL
    )
  `
  let version = (await tisseuseDb<Version[]>`SELECT * FROM version`)[0]
  if (version === undefined) {
    version = (
      await tisseuseDb<Version[]>`
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
    `Tisseuse database is too recent for current version of application: ${version.number} > ${versionNumber}.`,
  )
  if (version.number < versionNumber) {
    console.log(
      `Upgrading Tisseuse database from version ${version.number} to ${versionNumber}…`,
    )
  }

  // Apply patches that must be executed before every table is created.

  // Types

  // Tables

  // Table: titre_texte_autocompletion
  await tisseuseDb`
    CREATE TABLE IF NOT EXISTS titre_texte_autocompletion (
      autocompletion text NOT NULL,
      id text NOT NULL,
      PRIMARY KEY (id, autocompletion)
    )
  `

  // Apply patches that must be executed after every table is created.

  // Add indexes once every table and column exists.

  await tisseuseDb`
    CREATE INDEX IF NOT EXISTS titre_texte_autocompletion_trigrams_idx
    ON titre_texte_autocompletion
    USING GIST (autocompletion gist_trgm_ops)
  `

  // Add comments once every table and column exists.

  // Upgrade version number if needed.

  const previousVersionNumber = version.number

  version.number = versionNumber
  assert(
    version.number >= previousVersionNumber,
    `Error in Tisseuse database upgrade script: Wrong version number: ${version.number} < ${previousVersionNumber}.`,
  )
  if (version.number !== previousVersionNumber) {
    await tisseuseDb`UPDATE version SET number = ${version.number}`
    console.log(
      `Upgraded Tisseuse database from version ${previousVersionNumber} to ${version.number}.`,
    )
  }
}
