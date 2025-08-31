import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  iterOriginalMergedPositionsFromSimplified,
  simplifyHtml,
} from "$lib/text_simplifiers.js"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  outputDocumentPath: string,
  {
    date,
    "default-text": defaultTextId,
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
  }: {
    date: string
    "default-text"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  const inputHtml = await fs.readFile(inputDocumentPath, { encoding: "utf-8" })
  const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
  const inputText = conversion.output
  const context = new TextParserContext(inputText)
  const originalMergedPositionsFromSimplifiedIterator =
    iterOriginalMergedPositionsFromSimplified(conversion)
  // Initialize iterator by sending a dummy value and ignoring the result.
  originalMergedPositionsFromSimplifiedIterator.next({ start: 0, stop: 0 })
  let output = inputHtml
  let outputOffset = 0

  for await (const link of iterTextLinks(context, {
    date,
    defaultTextId,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
  })) {
    switch (link.type) {
      case "article": {
        const { articleId, position: articlePosition } = link
        const result =
          originalMergedPositionsFromSimplifiedIterator.next(articlePosition)
        if (result.done) {
          console.error(
            "Conversion of article position to HTML failed:",
            articlePosition,
          )
          process.exit(1)
        }
        const articleReverseConversion = result.value
        const original =
          (articleReverseConversion.innerPrefix ?? "") +
          output.slice(
            articleReverseConversion.position.start + outputOffset,
            articleReverseConversion.position.stop + outputOffset,
          ) +
          (articleReverseConversion.innerSuffix ?? "")
        const replacement = `${articleReverseConversion.outerPrefix ?? ""}<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>${articleReverseConversion.outerSuffix ?? ""}`
        output =
          output.slice(
            0,
            articleReverseConversion.position.start + outputOffset,
          ) +
          replacement +
          output.slice(articleReverseConversion.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (articleReverseConversion.position.stop -
            articleReverseConversion.position.start)
        break
      }

      case "division": {
        const { position: divisionPosition, sectionTaId } = link
        const result =
          originalMergedPositionsFromSimplifiedIterator.next(divisionPosition)
        if (result.done) {
          console.error(
            "Conversion of division position to HTML failed:",
            divisionPosition,
          )
          process.exit(1)
        }
        const divisionReverseConversion = result.value
        const original =
          (divisionReverseConversion.innerPrefix ?? "") +
          output.slice(
            divisionReverseConversion.position.start + outputOffset,
            divisionReverseConversion.position.stop + outputOffset,
          ) +
          (divisionReverseConversion.innerSuffix ?? "")
        const replacement = `${divisionReverseConversion.outerPrefix ?? ""}<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>${divisionReverseConversion.outerSuffix ?? ""}`
        output =
          output.slice(
            0,
            divisionReverseConversion.position.start + outputOffset,
          ) +
          replacement +
          output.slice(divisionReverseConversion.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (divisionReverseConversion.position.stop -
            divisionReverseConversion.position.start)
        break
      }

      case "texte": {
        const { text, position: textPosition } = link
        if (text.cid === undefined) {
          if (text.relative !== 0) {
            // It is not "la présente loi".
            throw new Error(
              `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
            )
          }
          continue
        }

        const result =
          originalMergedPositionsFromSimplifiedIterator.next(textPosition)
        if (result.done) {
          console.error(
            "Conversion of text position to HTML failed:",
            textPosition,
          )
          process.exit(1)
        }
        const textReverseConversion = result.value
        const original =
          (textReverseConversion.innerPrefix ?? "") +
          output.slice(
            textReverseConversion.position.start + outputOffset,
            textReverseConversion.position.stop + outputOffset,
          ) +
          (textReverseConversion.innerSuffix ?? "")
        const replacement = `${textReverseConversion.outerPrefix ?? ""}<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>${textReverseConversion.outerSuffix ?? ""}`
        output =
          output.slice(0, textReverseConversion.position.start + outputOffset) +
          replacement +
          output.slice(textReverseConversion.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (textReverseConversion.position.stop -
            textReverseConversion.position.start)
        break
      }

      default: {
        assertNever("Link", link)
      }
    }
  }

  await fs.writeFile(outputDocumentPath, output, { encoding: "utf-8" })
  return 0
}

sade("add_links_to_html_document <input_document> <output_document>", true)
  .describe("Add links to an HTML document")
  .option("-d, --date", "Date of HTML document in YYYY-MM-DD format")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-l, --default-text",
    "Optional Légifrance ID of the code or text to use when an article reference is ambiguous",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .action(async (inputDocumentPath, outputDocumentPath, options) => {
    process.exit(
      await addLinksToHtmlDocument(
        inputDocumentPath,
        outputDocumentPath,
        options,
      ),
    )
  })
  .parse(process.argv)
