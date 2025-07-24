import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  iterOriginalPositionsFromSimplified,
  simplifyHtml,
} from "$lib/text_simplifiers.js"
import type { TextAstLocalizationRelative } from "$lib/text_parsers/ast.js"

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
  const inputText = conversion.text
  const context = new TextParserContext(inputText)
  const originalPositionsFromSimplifiedIterator =
    iterOriginalPositionsFromSimplified(conversion.task)
  // Initialize iterator by sending a dummy value and ignoring the result.
  originalPositionsFromSimplifiedIterator.next({ start: 0, stop: 0 })
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
          originalPositionsFromSimplifiedIterator.next(articlePosition)
        if (result.done) {
          console.error(
            "Conversion of article position to HTML failed:",
            articlePosition,
          )
          process.exit(1)
        }
        const htmlPosition = result.value
        const original = output.slice(
          htmlPosition.start + outputOffset,
          htmlPosition.stop + outputOffset,
        )
        const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>`
        output =
          output.slice(0, htmlPosition.start + outputOffset) +
          replacement +
          output.slice(htmlPosition.stop + outputOffset)
        outputOffset += replacement.length - original.length
        break
      }

      case "texte": {
        const { text, position: textPosition } = link
        if (text.cid === undefined) {
          if (
            (text.localization as TextAstLocalizationRelative)?.relative !== 0
          ) {
            // It is not "la présente loi".
            throw new Error(
              `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
            )
          }
          continue
        }

        const result =
          originalPositionsFromSimplifiedIterator.next(textPosition)
        if (result.done) {
          console.error(
            "Conversion of text position to HTML failed:",
            textPosition,
          )
          process.exit(1)
        }
        const htmlPosition = result.value
        const original = output.slice(
          htmlPosition.start + outputOffset,
          htmlPosition.stop + outputOffset,
        )
        const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>`
        output =
          output.slice(0, htmlPosition.start + outputOffset) +
          replacement +
          output.slice(htmlPosition.stop + outputOffset)
        outputOffset += replacement.length - original.length
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
