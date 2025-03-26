import { error } from "@sveltejs/kit"

import type { SectionTa } from "$lib/legal/index.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const sectionTa = (
    await db<{ data: SectionTa }[]>`
    SELECT data FROM section_ta
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (sectionTa === undefined) {
    error(404, `SECTION_TA ${params.id} non trouvé`)
  }

  const articleLienDbArray = await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id = ${params.id}
  `
  const texteVersionLienDbArray = await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id = ${params.id}
  `

  return {
    article_lien: articleLienDbArray,
    section_ta: sectionTa,
    texte_version_lien: texteVersionLienDbArray,
  }
}
