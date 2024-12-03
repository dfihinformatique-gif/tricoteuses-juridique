import { error } from "@sveltejs/kit"

import type { Article } from "$lib/legal"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params }) => {
  const article = (
    await db<{ data: Article }[]>`
    SELECT data FROM article
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (article === undefined) {
    error(404, `Article ${params.id} non trouvé`)
  }

  const articleLienDbArray = await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id = ${params.id}
  `
  const texteVersionLienDbArray = await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id = ${params.id}
  `

  return {
    article,
    article_lien: articleLienDbArray,
    texte_version_lien: texteVersionLienDbArray,
  }
}
