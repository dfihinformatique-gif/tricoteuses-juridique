import { gitPathFromId } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  iterOriginalMergedPositionsFromTransformed,
  type Transformation,
} from "$lib/text_parsers/transformers.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"

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
    const originalMergedPositionsFromTransformedIterator =
      iterOriginalMergedPositionsFromTransformed(transformation)
    // Initialize iterator by sending a dummy value and ignoring the result.
    originalMergedPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
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
        case "article_definition": {
          const { article, position: articlePosition, textId } = link
          const result =
            originalMergedPositionsFromTransformedIterator.next(articlePosition)
          if (result.done) {
            console.error(
              "Transformation of article position to HTML failed:",
              articlePosition,
            )
            process.exit(1)
          }
          const articleReverseTransformation = result.value
          const original =
            (articleReverseTransformation.innerPrefix ?? "") +
            output.slice(
              articleReverseTransformation.position.start + outputOffset,
              articleReverseTransformation.position.stop + outputOffset,
            ) +
            (articleReverseTransformation.innerSuffix ?? "")
          const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<span class="definition_article" id="definition_article_${textId}_${article.num!}">${original}</span>${articleReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              articleReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleReverseTransformation.position.stop -
              articleReverseTransformation.position.start)
          break
        }

        case "external_article": {
          const { articleId, position: articlePosition } = link
          const result =
            originalMergedPositionsFromTransformedIterator.next(articlePosition)
          if (result.done) {
            console.error(
              "Transformation of article position to HTML failed:",
              articlePosition,
            )
            process.exit(1)
          }
          const articleReverseTransformation = result.value
          const original =
            (articleReverseTransformation.innerPrefix ?? "") +
            output.slice(
              articleReverseTransformation.position.start + outputOffset,
              articleReverseTransformation.position.stop + outputOffset,
            ) +
            (articleReverseTransformation.innerSuffix ?? "")
          const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              articleReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleReverseTransformation.position.stop -
              articleReverseTransformation.position.start)
          break
        }

        case "external_division": {
          const { position: divisionPosition, sectionTaId } = link
          const result =
            originalMergedPositionsFromTransformedIterator.next(
              divisionPosition,
            )
          if (result.done) {
            console.error(
              "Transformation of division position to HTML failed:",
              divisionPosition,
            )
            process.exit(1)
          }
          const divisionReverseTransformation = result.value
          const original =
            (divisionReverseTransformation.innerPrefix ?? "") +
            output.slice(
              divisionReverseTransformation.position.start + outputOffset,
              divisionReverseTransformation.position.stop + outputOffset,
            ) +
            (divisionReverseTransformation.innerSuffix ?? "")
          const replacement = `${divisionReverseTransformation.outerPrefix ?? ""}<a class="lien_division_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>${divisionReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              divisionReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              divisionReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (divisionReverseTransformation.position.stop -
              divisionReverseTransformation.position.start)
          break
        }

        case "external_text": {
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
            originalMergedPositionsFromTransformedIterator.next(textPosition)
          if (result.done) {
            console.error(
              "Transformation of text position to HTML failed:",
              textPosition,
            )
            process.exit(1)
          }
          const textReverseTransformation = result.value
          const original =
            (textReverseTransformation.innerPrefix ?? "") +
            output.slice(
              textReverseTransformation.position.start + outputOffset,
              textReverseTransformation.position.stop + outputOffset,
            ) +
            (textReverseTransformation.innerSuffix ?? "")
          const replacement = `${textReverseTransformation.outerPrefix ?? ""}<a class="lien_texte_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>${textReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              textReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(textReverseTransformation.position.stop + outputOffset)
          outputOffset +=
            replacement.length -
            (textReverseTransformation.position.stop -
              textReverseTransformation.position.start)
          break
        }

        case "internal_article": {
          const { definition, position: articlePosition } = link
          const result =
            originalMergedPositionsFromTransformedIterator.next(articlePosition)
          if (result.done) {
            console.error(
              "Transformation of article position to HTML failed:",
              articlePosition,
            )
            process.exit(1)
          }
          const articleReverseTransformation = result.value
          const original =
            (articleReverseTransformation.innerPrefix ?? "") +
            output.slice(
              articleReverseTransformation.position.start + outputOffset,
              articleReverseTransformation.position.stop + outputOffset,
            ) +
            (articleReverseTransformation.innerSuffix ?? "")
          const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              articleReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleReverseTransformation.position.stop -
              articleReverseTransformation.position.start)
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
