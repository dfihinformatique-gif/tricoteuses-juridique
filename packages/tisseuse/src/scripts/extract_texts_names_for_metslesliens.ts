import dedent from "dedent-js"
import metslesliens from "metslesliens"
import sade from "sade"

import type { LegiTexteVersion } from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"

async function extractTextsNames(): Promise<number> {
  console.log(dedent`
    /*****************************************************************************
     *                                                                           *
     *                         NOMS DES TEXTES JURIDIQUES                        *
     *                                                                           *
     *****************************************************************************/

    // Listes générées automatiquement par le script extract_texts_names_for_metslesliens
    // de @tricoteuses/legifrance.
  `)

  for (const nature of [
    "CODE",
    // "CONSTITUTION",
    // "DECLARATION",
  ]) {
    const titles: string[] = []
    for (const { data: texteVersion, id } of await db<
      { data: LegiTexteVersion; id: string }[]
    >`
      SELECT data, id
      FROM texte_version
      WHERE
        nature = ${nature}
        and id LIKE 'LEGITEXT%'
    `) {
      const title = texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL
      if (title === undefined) {
        console.warn(`Ignoring ${nature} ${id} without title.`)
        continue
      }
      titles.push(title)
    }
    const expressions = titles
      .map((title) => [title, title.toLowerCase().replace(/\s+/g, " ").trim()])
      .sort(([, title1], [, title2]) =>
        title1.startsWith(title2)
          ? -1
          : title2.startsWith(title1)
            ? 1
            : title1.localeCompare(title2),
      )
      .map(
        ([originalTitle, simplifiedTitle]) =>
          simplifiedTitle
            .replaceAll(",", " , ")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ")
            .map((word) =>
              /^[IVX]+$/gi.test(word)
                ? `( "${word}"i / "${metslesliens.romanToNumber(word)}" )`
                : `"${word.replace(/['’]\s*/g, '"i apostrophe "')}"i`,
            )
            .join(" _ ")
            .replaceAll(' _ ","i _ ', ' ( "," espacevide / _ ) ') +
          ` { return ${JSON.stringify(originalTitle)} }`,
      )
    console.log()
    console.log(dedent`
      // textes de nature "${nature}" :

      nom_${nature.toLowerCase()}
       = ${expressions.join("\n / ")}
    `)
  }

  return 0
}

sade("extract_texts_names_for_metslesliens", true)
  .describe(
    "Extract names of codes, laws, etc and convert them to metslesliens syntax (ake Peggy)",
  )
  .action(async () => {
    process.exit(await extractTextsNames())
  })
  .parse(process.argv)
