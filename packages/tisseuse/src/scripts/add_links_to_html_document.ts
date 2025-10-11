import { gitPathFromId } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  {
    date,
    "default-text-id": defaultTextId,
    "generate-links": outputDocumentPath,
    "generate-transformations": transformationsOutputDir,
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
    "use-transformations": transformationsInputDir,
  }: {
    date: string
    "default-text-id"?: string
    "generate-links"?: string
    "generate-transformations"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
    "use-transformations"?: string
  },
): Promise<number> {
  const inputHtml = await fs.readFile(inputDocumentPath, { encoding: "utf-8" })
  let transformation: Transformation
  if (transformationsInputDir === undefined) {
    transformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
    if (transformationsOutputDir !== undefined) {
      writeTransformation(transformation, transformationsOutputDir)
    }
  } else {
    transformation = readTransformation(inputHtml, transformationsInputDir)
  }
  if (outputDocumentPath !== undefined) {
    const inputText = transformation.output
    const context = new TextParserContext(inputText)
    let output = inputHtml
    let outputOffset = 0

    for await (const link of iterTextLinks(context, {
      date,
      defaultTextId,
      logIgnoredReferencesTypes,
      logPartialReferences,
      logReferences,
      transformation,
    })) {
      switch (link.type) {
        case "article_definition": {
          const {
            article,
            originalTransformation: articleOriginalTransformation,
            textId,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in article definition: ${link}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<span class="definition_article" id="definition_article_${textId}_${article.num!}">${original}</span>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        case "external_article": {
          const {
            articleId,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleId !== undefined) {
            if (articleOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external article link: ${link}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              articleOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              articleOriginalTransformation,
              `<a class="lien_article_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                articleOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                articleOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (articleOriginalTransformation.position.stop -
                articleOriginalTransformation.position.start)
          }
          break
        }

        case "external_division": {
          const {
            originalTransformation: divisionOriginalTransformation,
            sectionTaId,
          } = link
          if (sectionTaId !== undefined) {
            if (divisionOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external division link: ${link}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              divisionOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              divisionOriginalTransformation,
              `<a class="lien_division_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                divisionOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                divisionOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (divisionOriginalTransformation.position.stop -
                divisionOriginalTransformation.position.start)
          }
          break
        }

        case "external_text": {
          const { originalTransformation: texteOriginalTransformation, text } =
            link
          if (text.cid === undefined) {
            if (text.relative !== 0) {
              // It is not "la présente loi".
              throw new Error(
                `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
              )
            }
            continue
          }

          if (texteOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in external text link: ${link}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            texteOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            texteOriginalTransformation,
            `<a class="lien_texte_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>`,
          )
          output =
            output.slice(
              0,
              texteOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              texteOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (texteOriginalTransformation.position.stop -
              texteOriginalTransformation.position.start)
          break
        }

        case "internal_article": {
          const {
            definition,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in internal article link: ${link}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        default: {
          assertNever("Link", link)
        }
      }
    }

    await fs.writeFile(outputDocumentPath, output, { encoding: "utf-8" })
  }
  return 0
}

sade("add_links_to_html_document <input_document>", true)
  .describe("Add links to an HTML document")
  .option("-d, --date", "Date of HTML document in YYYY-MM-DD format")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-id, --default-text-id",
    "Optional Légifrance ID of the code or text to use when an article reference is ambiguous",
  )
  .option(
    "-l, --generate-links",
    "Generate HTML document with links in given file path",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .option(
    "-t, --generate-transformations",
    "Store HTML to text transformations to given dir",
  )
  .option(
    "-u, --use-transformations",
    "Use text transformations at given dir instead of HTML document",
  )
  .action(async (inputDocumentPath, options) => {
    process.exit(await addLinksToHtmlDocument(inputDocumentPath, options))
  })
  .parse(process.argv)
