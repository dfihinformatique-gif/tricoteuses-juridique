/**
 * Like script `add_references_to_html_document.ts`, but instead of adding references
 * to ann HTML document, it adds reference informations.
 * Useful for debugging.
 */

import fs from "fs-extra"
import sade from "sade"

import { iterReferences } from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  iterOriginalMergedPositionsFromTransformed,
  type Transformation,
} from "$lib/text_parsers/transformers.js"
import { escapeHtml } from "$lib/strings.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"

async function addReferencesToHtmlDocument(
  inputDocumentPath: string,
  {
    "generate-transformations": transformationsOutputDir,
    "generate-references": outputDocumentPath,
    "use-transformations": transformationsInputDir,
  }: {
    "generate-transformations"?: string
    "generate-references"?: string
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

    for await (const reference of iterReferences(context)) {
      const { position } = reference
      const result =
        originalMergedPositionsFromTransformedIterator.next(position)
      if (result.done) {
        console.error(
          "Transformation of article position to HTML failed:",
          position,
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
      const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<span style="background-color: #eae462" title=${escapeHtml(JSON.stringify(reference))}>${original}</span>${articleReverseTransformation.outerSuffix ?? ""}`
      output =
        output.slice(
          0,
          articleReverseTransformation.position.start + outputOffset,
        ) +
        replacement +
        output.slice(articleReverseTransformation.position.stop + outputOffset)
      outputOffset +=
        replacement.length -
        (articleReverseTransformation.position.stop -
          articleReverseTransformation.position.start)
    }

    await fs.writeFile(outputDocumentPath, output, { encoding: "utf-8" })
  }
  return 0
}

sade("add_references_to_html_document <input_document>", true)
  .describe("Add references to an HTML document")
  .option(
    "-r, --generate-references",
    "Generate HTML document with references in given file path",
  )
  .option(
    "-t, --generate-transformations",
    "Store HTML to text transformations to given dir",
  )
  .option(
    "-u, --use-transformations",
    "Use text transformations at given dir instead of HTML document",
  )
  .action(async (inputDocumentPath, options) => {
    process.exit(await addReferencesToHtmlDocument(inputDocumentPath, options))
  })
  .parse(process.argv)
