import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  strictAudit,
} from "@auditors/core"
import {
  type Jo,
  type JorfTexteVersion,
  type LegiTexteVersion,
} from "@tricoteuses/legifrance"
import {
  getOrLoadTextelr,
  getOrLoadTextesVersions,
  newLegifranceObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import {
  suggestionFromSuggestionDb,
  type Suggestion,
  type SuggestionDb,
} from "$lib/autocompletion.js"
import { legiDb, tisseuseDb } from "$lib/server/databases/index.js"

import type { HomePageInfos } from "./home.js"

export const queryHomePageInfos = query(async (): Promise<HomePageInfos> => {
  const [documents, dossiersParlementaires, jos, textes] = await Promise.all([
    (async (): Promise<Suggestion[]> =>
      (
        await tisseuseDb<Array<SuggestionDb>>`
          SELECT
            autocompletion,
            badge,
            date,
            0 AS distance,
            id
          FROM titre_texte_autocompletion
          WHERE
            type = 'Assemblée document'
          ORDER BY date DESC
          LIMIT 5
        `
      ).map(suggestionFromSuggestionDb))(),
    (async (): Promise<Suggestion[]> =>
      (
        await tisseuseDb<Array<SuggestionDb>>`
          SELECT
            autocompletion,
            badge,
            date,
            0 AS distance,
            id
          FROM titre_texte_autocompletion
          WHERE
            type = 'Assemblée dossier'
          ORDER BY date DESC
          LIMIT 5
        `
      ).map(suggestionFromSuggestionDb))(),
    (async (): Promise<Suggestion[]> =>
      (
        await legiDb<Array<SuggestionDb>>`
          SELECT
            data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'TITRE' AS autocompletion,
            data -> 'META' -> 'META_COMMUN' ->> 'NATURE' as badge,
            data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' AS date,
            0 AS distance,
            id
          FROM jo
          WHERE data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' <> '2999-01-01'
          ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' DESC
          LIMIT 5
        `
      ).map(suggestionFromSuggestionDb))(),
    (async (): Promise<Suggestion[]> =>
      (
        await tisseuseDb<Array<SuggestionDb>>`
          SELECT
            autocompletion,
            badge,
            date,
            0 AS distance,
            id
          FROM titre_texte_autocompletion
          WHERE
            type = 'Légifrance texte'
            AND date <> '2999-01-01'
          ORDER BY date DESC
          LIMIT 5
        `
      ).map(suggestionFromSuggestionDb))(),
  ])

  return {
    documents,
    dossiersParlementaires,
    jos,
    textes,
  }
})
