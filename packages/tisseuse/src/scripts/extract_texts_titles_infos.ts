import fs from "fs-extra"
import sade from "sade"

import type { LegiTexteVersion } from "$lib/legal/legi.js"
import { numberFromRomanNumeral } from "$lib/numbers.js"
import { db } from "$lib/server/databases/index.js"
import type {
  TextAstText,
  TextAstTextIdentification,
} from "$lib/text_parsers/ast.js"
import { chain, TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  natureTexteFrancais,
  numeroEtOuDateTexteFrancais,
} from "$lib/text_parsers/texts.js"
import { espace } from "$lib/text_parsers/typography.js"
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
  const textCidByStandardTitleWordsTree: Record<string, TextCidByWordsTree> = {}
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
    for (const { data: texteVersion, id } of await db<
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
      const title = texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL
      if (title === undefined) {
        console.warn(`Ignoring ${nature} ${id} without title.`)
        continue
      }

      textInfosByCid[cid] = {
        nature,
        title: title
          .replace(/\n/g, " ")
          .replace(/ {2,}/g, " ")
          .replace(/ \(\d+\)$/, ""),
      }

      const otherTitles: string[] = []
      let titleToParse: string
      switch (title) {
        case "Constitution du 4 octobre 1958": {
          titleToParse = title
          otherTitles.push("Constitution")
          break
        }
        case "Loi 16 décembre 1941 relative aux créations, transferts ou suppressions d'offices ministériels.": {
          otherTitles.push(title)
          titleToParse =
            "Loi du 16 décembre 1941 relative aux créations, transferts ou suppressions d'offices ministériels"
          break
        }

        case "Loi contenant organisation du notariat (loi 25 ventôse an XI)": {
          otherTitles.push(title)
          otherTitles.push(
            "Loi contenant organisation du notariat (loi du 25 ventôse an XI)",
          )
          otherTitles.push(
            "Loi du 25 ventôse an XI contenant organisation du notariat",
          )
          titleToParse =
            "Loi du 16 mars 1803 contenant organisation du notariat"
          break
        }

        case "Loi de finances rectificative pour 1963 (n° 63-1293 du 21 décembre 1963)": {
          titleToParse =
            "Loi n° 63-1293 du 21 décembre 1963 de finances rectificative pour 1963"
          break
        }

        case "Loi de finances rectificative pour 1964 (n° 64-1278 du 23 décembre 1964)": {
          titleToParse =
            "Loi n° 64-1278 du 23 décembre 1964 de finances rectificative pour 1964"
          break
        }

        case "LOI de programmation du « nouveau contrat pour l'école » (n° 95-836 du 13  juillet 1995)": {
          titleToParse =
            "Loi n° 95-836 du 13 juillet 1995 de programmation du « nouveau contrat pour l'école »"
          break
        }

        case "Loi des 16-24 août 1790 sur l'organisation judiciaire": {
          otherTitles.push(title)
          titleToParse = "Loi du 16 août 1790 sur l'organisation judiciaire"
          break
        }

        case "Loi du 18 germinal an X (8 avril 1802) relative à l'organisation des cultes": {
          otherTitles.push(title)
          otherTitles.push(
            "Loi du 18 germinal an X relative à l'organisation des cultes",
          )
          otherTitles.push(
            "Loi relative à l'organisation des cultes (loi du 18 germinal an X)",
          )
          titleToParse =
            "Loi du 8 avril 1802 relative à l'organisation des cultes"
          break
        }

        default: {
          titleToParse = title
        }
      }
      const simplifiedTitle = simplifyTextTitle(titleToParse)
      if (
        [
          "CONSTITUTION",
          "LOI",
          "LOI_CONSTIT",
          "LOI_ORGANIQUE",
          "LOI_PROGRAMME",
          "ORDONNANCE",
        ].includes(nature)
      ) {
        const context = new TextParserContext(simplifiedTitle)
        const titleParsing = chain(
          [natureTexteFrancais, espace, numeroEtOuDateTexteFrancais],
          {
            value: (results) => ({
              ...(results[0] as TextAstText),
              ...(results[2] as TextAstTextIdentification),
            }),
          },
        )(context) as TextAstText | undefined
        if (titleParsing == null) {
          throw new Error(
            `Unparsable title of ${nature} n° ${num} du ${dateSignature} (${cid}): ${titleToParse}`,
          )
        }
        const standardTitle = context.remaining()
        if (standardTitle !== "") {
          addTextCidToWordsTree(
            textCidByStandardTitleWordsTree,
            standardTitle,
            cid,
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
      } else {
        addTextCidToWordsTree(textCidByOtherTitleWordsTree, titleToParse, cid)
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
      textCidByStandardTitleWordsTree,
      textsCidsByNatureAndDate,
      textsCidsByNatureAndNum,
    },
    { encoding: "utf-8", spaces: 2 },
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
