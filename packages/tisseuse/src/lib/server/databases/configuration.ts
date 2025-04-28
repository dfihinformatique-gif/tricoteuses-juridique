import assert from "assert"

import type { TexteVersion } from "$lib/legal/index.js"
import { db, type Version, versionNumber } from "$lib/server/databases/index.js"

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

  if (version.number < 3) {
    await db`
      ALTER TABLE IF EXISTS texte_version
      ADD COLUMN IF NOT EXISTS nature text
    `
    await db`
      ALTER TABLE IF EXISTS texte_version
      ADD COLUMN IF NOT EXISTS text_search tsvector
    `
  }

  if (version.number < 4) {
    await db`
      ALTER TABLE IF EXISTS texte_version
      ALTER COLUMN nature DROP NOT NULL
    `
  }

  if (version.number < 6) {
    await db`
      ALTER TABLE IF EXISTS dossier_legislatif
      ADD COLUMN IF NOT EXISTS jorf_texte_principal_id char(20)
    `
    await db`
      ALTER TABLE IF EXISTS dossier_legislatif
      ADD COLUMN IF NOT EXISTS jorf_textes_id char(20)[]
    `

    await db`
      DROP TABLE IF EXISTS dossier_legislatif_assemblee_associations
    `

    await db`
      ALTER TABLE IF EXISTS texte_version
      ADD COLUMN IF NOT EXISTS est_texte_principal boolean
    `
  }

  if (version.number < 7) {
    await db`
      ALTER TABLE IF EXISTS texte_version
      ADD COLUMN IF NOT EXISTS commission_fond_assemblee_uid text
    `
  }

  if (version.number < 8) {
    await db`
      ALTER TABLE IF EXISTS texte_version
      ADD COLUMN IF NOT EXISTS nature_et_num text
    `
  }

  if (version.number < 10) {
    await db`
      DROP TABLE article_lien
    `
    await db`
      DROP TABLE texte_version_lien
    `
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
  //     id char(20) NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  //     weight int NOT NULL,
  //     PRIMARY KEY (id, autocompletion)
  //   )
  // `

  // Table: article_git
  await db`
    CREATE TABLE IF NOT EXISTS article_git (
      id char(20) PRIMARY KEY REFERENCES article(id) ON DELETE CASCADE,
      date char(10) NOT NULL,
      path text NOT NULL
    )
  `

  // Table: article_lien
  await db`
    CREATE TABLE IF NOT EXISTS article_lien (
      article_id char(20) NOT NULL REFERENCES article(id) ON DELETE CASCADE,
      cible boolean,
      cidtexte char(20),
      id char(20) NOT NULL,
      typelien text NOT NULL,
      PRIMARY KEY (article_id, cible, typelien, id)
    )
  `

  // Table: consolidated_texts_git_states
  await db`
    CREATE TABLE IF NOT EXISTS consolidated_texts_git_hashes (
      id char(20) PRIMARY KEY NOT NULL REFERENCES texte_version(id) ON DELETE CASCADE,
      data_hash text NOT NULL,
      source_code_commit_oid text NOT NULL
    )
  `

  // Table: dossier_legislatif
  await db`
    CREATE TABLE IF NOT EXISTS dossier_legislatif (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL,
      jorf_texte_principal_id char(20),
      jorf_textes_id char(20)[]
    )
  `

  // Table: id
  await db`
    CREATE TABLE IF NOT EXISTS id (
      eli text PRIMARY KEY,
      id char(20) NOT NULL
    )
  `

  // Table: idcc
  await db`
    CREATE TABLE IF NOT EXISTS idcc (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL
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

  // Table: section_ta_git
  await db`
    CREATE TABLE IF NOT EXISTS section_ta_git (
      id char(20) PRIMARY KEY REFERENCES section_ta(id) ON DELETE CASCADE,
      date char(10) NOT NULL,
      path text NOT NULL
    )
  `

  // Table: texte_version
  await db`
    CREATE TABLE IF NOT EXISTS texte_version (
      id char(20) PRIMARY KEY,
      data jsonb NOT NULL,
      commission_fond_assemblee_uid text,
      est_texte_principal boolean,
      nature text,
      nature_et_num text,
      text_search tsvector NOT NULL
    )
  `

  // Table: texte_version_dossier_legislatif_assemblee_associations
  await db`
    CREATE TABLE IF NOT EXISTS texte_version_dossier_legislatif_assemblee_associations (
      id char(20) PRIMARY KEY REFERENCES texte_version(id) ON DELETE CASCADE,
      assemblee_uid char(13) NOT NULL
    )
  `

  // Table: texte_version_git
  await db`
    CREATE TABLE IF NOT EXISTS texte_version_git (
      id char(20) PRIMARY KEY REFERENCES texte_version(id) ON DELETE CASCADE,
      date char(10) NOT NULL,
      path text NOT NULL
    )
  `

  // Table: texte_version_lien
  await db`
  CREATE TABLE IF NOT EXISTS texte_version_lien (
      texte_version_id char(20) NOT NULL REFERENCES texte_version(id) ON DELETE CASCADE,
      cible boolean,
      cidtexte char(20),
      id char(20) NOT NULL,
      typelien text NOT NULL,
      PRIMARY KEY (texte_version_id, cible, typelien, id)
    )
  `

  // Table: textekali
  await db`
    CREATE TABLE IF NOT EXISTS textekali (
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

  if (version.number < 3) {
    // Fill "nature" column of table texte_version.
    for await (const rows of db<
      Array<{ data: TexteVersion; id: string; nature: string }>
    >`SELECT data, id, nature FROM texte_version`.cursor(100)) {
      for (const { data, id, nature } of rows) {
        if ((data.META.META_COMMUN.NATURE ?? null) !== nature) {
          await db`
            UPDATE texte_version
            SET nature = ${data.META.META_COMMUN.NATURE ?? null}
            WHERE id = ${id}
          `
        }
      }
    }

    // Fill "text_search" column of table texte_version.
    for await (const rows of db<
      Array<{ data: TexteVersion; id: string }>
    >`SELECT data, id FROM texte_version`.cursor(100)) {
      for (const { data, id } of rows) {
        const textAFragments = [
          data.META.META_SPEC.META_TEXTE_VERSION.TITRE,
          data.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
        ]
        // const vector = (await db<{vector: SerializableParameter}[]>`
        //   SELECT
        //     setweight(to_tsvector('french', ${textAFragments.join(" ")}), 'A')
        //     AS vector
        // `)[0].vector
        await db`
          UPDATE texte_version
          SET text_search = setweight(to_tsvector('french', ${textAFragments.join(
            " ",
          )}), 'A')
          WHERE id = ${id}
        `
      }
    }
    await db`
      ALTER TABLE texte_version
      ALTER COLUMN text_search SET NOT NULL
    `
  }

  if (version.number < 8) {
    // Fill "nature_et_num" column of table texte_version;
    for await (const rows of db<
      Array<{ data: TexteVersion; id: string }>
    >`SELECT data, id FROM texte_version`.cursor(100)) {
      for (const { data, id } of rows) {
        const natureEtNum =
          data.META.META_COMMUN.NATURE !== undefined &&
          data.META.META_SPEC.META_TEXTE_CHRONICLE.NUM !== undefined
            ? `${data.META.META_COMMUN.NATURE.toUpperCase()}.${data.META.META_SPEC.META_TEXTE_CHRONICLE.NUM}`
            : null
        await db`
          UPDATE texte_version
          SET nature_et_num = ${natureEtNum}
          WHERE id = ${id}
        `
      }
    }
  }

  // Add indexes once every table and column exists.

  // await db`
  //   CREATE INDEX IF NOT EXISTS article_autocompletions_trigrams_idx
  //   ON article_autocompletions
  //   USING GIST (autocompletion gist_trgm_ops)
  // `

  await db`
    CREATE INDEX IF NOT EXISTS article_cid_key
    ON article ((data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid'))
  `

  await db`
    CREATE INDEX IF NOT EXISTS article_lien_cidtext_reverse_key
    ON article_lien (cidtexte, cible, typelien)
  `
  await db`
    CREATE INDEX IF NOT EXISTS article_lien_id_reverse_key
    ON article_lien (id, cible, typelien)
  `

  await db`
    CREATE INDEX IF NOT EXISTS article_num_key
    ON article ((data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM'))
  `

  await db`
    CREATE INDEX IF NOT EXISTS dossier_legislatif_jorf_texte_principal_id_key
    ON dossier_legislatif (jorf_texte_principal_id)
  `

  await db`
    CREATE INDEX IF NOT EXISTS dossier_legislatif_jorf_textes_id_key
    ON dossier_legislatif (jorf_textes_id)
  `

  await db`
    CREATE INDEX IF NOT EXISTS jo__key
    ON jo ((data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI'))
  `

  await db`
      CREATE INDEX IF NOT EXISTS section_ta_cid_key
      ON section_ta ((data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid'))
    `

  await db`
    CREATE INDEX IF NOT EXISTS texte_version_nature_et_num_key
    ON texte_version (nature_et_num)
  `

  await db`
    CREATE INDEX IF NOT EXISTS texte_version_lien_cidtext_reverse_key
    ON texte_version_lien (cidtexte, cible, typelien)
  `

  await db`
    CREATE INDEX IF NOT EXISTS texte_version_lien_id_reverse_key
    ON texte_version_lien (id, cible, typelien)
  `

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
