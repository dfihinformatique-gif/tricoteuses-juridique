import { error } from "@sveltejs/kit"

import type { TexteVersion } from "$lib/legal/index.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const texteVersion = (
    await db<{ data: TexteVersion }[]>`
    SELECT data FROM texte_version
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (texteVersion === undefined) {
    error(404, `TEXTE_VERSION ${params.id} non trouvé`)
  }

  const articleLienDbArray = await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id = ${params.id}
  `
  const texteVersionLienDbArray = await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id = ${params.id}
  `

  return {
    article_lien: articleLienDbArray,
    texte_version: texteVersion,
    texte_version_lien: texteVersionLienDbArray,
  }
}
