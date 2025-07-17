import sade from "sade"

import type { LegiTexteVersion } from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"
import {
  chainSimplifiers,
  replacePatterns,
  simplifyText,
} from "$lib/text_simplifiers.js"
import { numberFromRomanNumeral } from "$lib/text_parsers/numbers.js"

type TextsTitlesWordsTree = {
  cid?: string
  nature?: string
  title?: string
} & {
  [word: string]: TextsTitlesWordsTree
}

async function extractTextsNames(): Promise<number> {
  const textsTitlesWordsTree: TextsTitlesWordsTree = {}
  for (const nature of [
    "CODE",
    // "CONSTITUTION",
    // "DECLARATION",
    "LOI",
    "LOI_CONSTIT",
    "LOI_ORGANIQUE",
    "LOI_PROGRAMME",
    "ORDONNANCE",
  ]) {
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
      const words = chainSimplifiers(
        "Simplification d'un titre de texte",
        [replacePatterns, simplifyText],
        title.toLowerCase().replace(/[\n,]/g, " "),
      )
        .text.replace(/ \(\d+\)$/, "")
        .split(" ")
        .map((word) =>
          /^[IVX]+$/gi.test(word)
            ? numberFromRomanNumeral(word).toString()
            : word,
        )

      let textsTitlesWordsNode = textsTitlesWordsTree
      for (const word of words) {
        textsTitlesWordsNode = (textsTitlesWordsNode[word] ??=
          {}) as TextsTitlesWordsTree
      }
      textsTitlesWordsNode.cid =
        texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.CID
      textsTitlesWordsNode.nature = nature
      textsTitlesWordsNode.title = title
    }
  }
  console.log(JSON.stringify(textsTitlesWordsTree, null, 2))

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
