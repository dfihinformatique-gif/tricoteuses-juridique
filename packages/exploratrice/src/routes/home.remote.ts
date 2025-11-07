import { query } from "$app/server"
import {
  suggestionFromSuggestionDb,
  type Suggestion,
  type SuggestionDb,
} from "$lib/autocompletion.js"
import { legiDb, tisseuseDb } from "$lib/server/databases/index.js"

import type { HomePageInfos } from "./home.js"

export const queryHomePageInfos = query(async (): Promise<HomePageInfos> => {
  const today = new Date().toISOString().split("T")[0]
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
            AND date <= ${today}
          ORDER BY date DESC NULLS LAST
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
            AND date <= ${today}
          ORDER BY date DESC NULLS LAST
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
          WHERE data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' <= ${today}
          ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' DESC NULLS LAST
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
            AND date <= ${today}
          ORDER BY date DESC NULLS LAST
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
