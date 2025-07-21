import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_simplifiers.js"

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
  const conversion = simplifyHtml({ removeAWithHref: true })(
    await fs.readFile(inputDocumentPath, { encoding: "utf-8" }),
  )
  const input = conversion.text
  const context = new TextParserContext(input)
  let output = input
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
        const { articleId, position } = link
        const original = output.substring(
          position.start + outputOffset,
          position.stop + outputOffset,
        )
        const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>`
        output =
          output.substring(0, position.start + outputOffset) +
          replacement +
          output.substring(position.stop + outputOffset)
        outputOffset += replacement.length - original.length
        break
      }

      case "texte": {
        const { text, position } = link
        const original = output.substring(
          position.start + outputOffset,
          position.stop + outputOffset,
        )
        const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>`
        output =
          output.substring(0, position.start + outputOffset) +
          replacement +
          output.substring(position.stop + outputOffset)
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
