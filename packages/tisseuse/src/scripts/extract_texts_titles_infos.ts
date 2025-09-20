import type { LegiTexteVersion } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import { jsonReplacer } from "$lib/json.js"
import { numberFromRomanNumeral } from "$lib/numbers.js"
import { legiDb } from "$lib/server/databases/index.js"
import type { TextAstText } from "$lib/text_parsers/ast.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { definitionTexteFrancais } from "$lib/text_parsers/texts.js"
import {
  replacePatterns,
  simplifyText,
  simplifyUnicodeCharacters,
} from "$lib/text_parsers/simplifiers.js"
import { chainTransformers } from "$lib/text_parsers/transformers.js"

type TextCidByWordsTree = {
  cid?: string | string[]
} & {
  [word: string]: TextCidByWordsTree
}

function addTextCidToWordsTree(
  textCidByWordsTree: TextCidByWordsTree,
  title: string,
  cid: string,
): void {
  const words = simplifyTextTitle(
    title
      .replace(/ \(\d+\)$/, "")
      .replace(/\.$/, "")
      .replace(/[\n,()]/g, " "),
  )
    .split(" ")
    .map((word) =>
      /^[IVX]+$/gi.test(word)
        ? numberFromRomanNumeral(word).toString()
        : word.toLowerCase().replace(/^no$/, "n°"),
    )
  let textCidByWordsNode = textCidByWordsTree
  for (const word of words) {
    textCidByWordsNode = (textCidByWordsNode[word] ??= {}) as TextCidByWordsTree
  }
  if (textCidByWordsNode.cid == undefined) {
    textCidByWordsNode.cid = cid
  } else if (Array.isArray(textCidByWordsNode.cid)) {
    textCidByWordsNode.cid.push(cid)
  } else {
    textCidByWordsNode.cid = [textCidByWordsNode.cid, cid]
  }
}

async function extractTextsNames(): Promise<number> {
  const textCidByOtherTitleWordsTree: TextCidByWordsTree = {}
  const textCidByTitleRestWordsTree: Record<
    string,
    TextCidByWordsTree
  > = {}
  const textInfosByCid: Record<
    string,
    {
      nature: string
      title: string
    }
  > = {}
  const textsCidsByNatureAndDate: Record<string, Record<string, string[]>> = {}
  const textsCidsByNatureAndNum: Record<string, Record<string, string[]>> = {}
  for (const nature of [
    // "ARRETE",
    // "CIRCULAIRE",
    "CODE",
    "CONSTITUTION",
    // "DECLARATION",
    // "DECRET",
    // "DECRET_LOI",
    "LOI",
    "LOI_CONSTIT",
    "LOI_ORGANIQUE",
    "LOI_PROGRAMME",
    "ORDONNANCE",
  ]) {
    for (const { data: texteVersion, id } of await legiDb<
      { data: LegiTexteVersion; id: string }[]
    >`
      SELECT data, id
      FROM texte_version
      WHERE
        nature = ${nature}
        and id LIKE 'LEGITEXT%'
    `) {
      const cid = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.CID
      const dateSignature =
        texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
      const num = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM
      const rawTitle = texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL
      if (rawTitle === undefined) {
        console.warn(`Ignoring ${nature} ${id} without title.`)
        continue
      }
      const title = rawTitle
        .replace(/\n/g, " ")
        .replace(/ {2,}/g, " ")
        .replace(/ \(\d+\)\.?$/, "")
        .replace(/\.$/, "")

      textInfosByCid[cid] = {
        nature,
        title,
      }

      const otherTitles = new Set<string>()
      const titlesToParse = new Set<string>()
      switch (title) {
        case "Constitution du 4 octobre 1958": {
          titlesToParse.add(title)
          otherTitles.add("Constitution")
          break
        }

        case "Loi contenant organisation du notariat (loi 25 ventôse an XI)": {
          titlesToParse.add(
            "Loi du 25 ventôse an XI (16 mars 1803) contenant organisation du notariat",
          )
          break
        }

        case "Loi des 16-24 août 1790 sur l'organisation judiciaire": {
          otherTitles.add(title)
          titlesToParse.add("Loi du 16 août 1790 sur l'organisation judiciaire")
          break
        }

        case "Loi n° 77-1423 du 27 décembre 1977 77-1423 du 27 décembre 1977 autorisant l'approbation de la convention sur le commerce international des espèces de faune et de flore sauvages menacées d'extinction, ensemble quatre annexes, ouverte à la signature à Washington jusqu'au 30 avril 1973 et, après cette date, à Berne jusqu'au 31 décembre 1974": {
          titlesToParse.add(
            "Loi n° 77-1423 du 27 décembre 1977 autorisant l'approbation de la convention sur le commerce international des espèces de faune et de flore sauvages menacées d'extinction, ensemble quatre annexes, ouverte à la signature à Washington jusqu'au 30 avril 1973 et, après cette date, à Berne jusqu'au 31 décembre 1974",
          )
          break
        }

        default: {
          titlesToParse.add(title)
        }
      }

      for (const titleToParse of titlesToParse) {
        const simplifiedTitle = simplifyTextTitle(titleToParse)
        const context = new TextParserContext(simplifiedTitle)
        const titleParsing = definitionTexteFrancais(context) as
          | TextAstText
          | undefined
        if (titleParsing == null) {
          throw new Error(
            `Unparsable title of ${nature} n° ${num} du ${dateSignature} (${cid}): ${titleToParse}`,
          )
        }
        if (titleParsing.date !== undefined) {
          ;((textsCidsByNatureAndDate[nature] ??= {})[titleParsing.date] ??=
            []).push(cid)
        }
        if (titleParsing.num !== undefined) {
          ;((textsCidsByNatureAndNum[nature] ??= {})[titleParsing.num] ??=
            []).push(cid)
        }
        if (
          titleParsing.titleRest === undefined &&
          nature !== "CONSTITUTION"
        ) {
          throw new Error(
            `Unable to extract title without date, nature & num from ${nature} n° ${num} du ${dateSignature} (${cid}): ${titleToParse}`,
          )
        }
        if (titleParsing.titleRest !== undefined) {
          addTextCidToWordsTree(
            textCidByTitleRestWordsTree,
            titleParsing.titleRest,
            cid,
          )
        }
      }

      for (const title of otherTitles) {
        addTextCidToWordsTree(textCidByOtherTitleWordsTree, title, cid)
      }
    }
  }
  await fs.writeJson(
    "src/lib/text_parsers/text_titles_infos.json",
    {
      textInfosByCid,
      textCidByOtherTitleWordsTree,
      textCidByTitleRestWordsTree,
      textsCidsByNatureAndDate,
      textsCidsByNatureAndNum,
    },
    { encoding: "utf-8", replacer: jsonReplacer, spaces: 2 },
  )

  return 0
}

function simplifyTextTitle(title: string): string {
  return chainTransformers("Simplification d'un titre de texte", [
    replacePatterns,
    simplifyUnicodeCharacters,
    simplifyText,
  ])(title).output
}

sade("extract_texts_titles_infos", true)
  .describe(
    "Extract names of codes, laws, etc and convert them to JSON structures used by text parser",
  )
  .action(async () => {
    process.exit(await extractTextsNames())
  })
  .parse(process.argv)
