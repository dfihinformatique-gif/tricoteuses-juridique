/**
 * Like script `add_references_to_html_document.ts`, but instead of adding references
 * to ann HTML document, it adds reference informations.
 * Useful for debugging.
 */

import { escapeHtml } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"
import { iterIncludedReferences } from "$lib/text_parsers/helpers.js"
import { parseReferencesWithOriginalTransformations } from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

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
    let outputHtml = inputHtml
    let outputOffset = 0
    for await (const reference of parseReferencesWithOriginalTransformations(
      context,
      transformation,
    )) {
      const { originalTransformation } = reference
      if (originalTransformation === undefined) {
        throw new Error(
          `Missing originalTransformation attribute in reference: ${reference}`,
        )
      }
      let fragment = outputHtml.slice(
        originalTransformation.position.start + outputOffset,
        originalTransformation.position.stop + outputOffset,
      )

      // If fragment contains references in citations, first add HTML markers for these
      // references in the fragment.
      let fragmentOffset = -originalTransformation.position.start
      for (const includedReference of iterIncludedReferences(reference)) {
        if (includedReference.type === "reference_et_action") {
          const { originalCitations } = includedReference.action
          if (originalCitations !== undefined) {
            for (const citation of originalCitations) {
              if (citation.references !== undefined) {
                for (const citationReference of citation.references) {
                  const {
                    originalTransformation:
                      citationReferenceOriginalTransformation,
                  } = citationReference
                  if (citationReferenceOriginalTransformation === undefined) {
                    throw new Error(
                      `Missing originalTransformation attribute in citation reference: ${citationReference}`,
                    )
                  }
                  const fragmentInFragment = reverseTransformedInnerFragment(
                    fragment,
                    citationReferenceOriginalTransformation,
                    fragmentOffset,
                  )
                  const replacement = reverseTransformedReplacement(
                    citationReferenceOriginalTransformation,
                    `<span style="background-color: #00ff00" title="${escapeHtml(JSON.stringify(citationReference), true)}">${fragmentInFragment}</span>`,
                  )
                  fragment =
                    fragment.slice(
                      0,
                      citationReferenceOriginalTransformation.position.start +
                        fragmentOffset,
                    ) +
                    replacement +
                    fragment.slice(
                      citationReferenceOriginalTransformation.position.stop +
                        fragmentOffset,
                    )
                  fragmentOffset +=
                    replacement.length -
                    (citationReferenceOriginalTransformation.position.stop -
                      citationReferenceOriginalTransformation.position.start)
                }
              }
            }
          }
        }
      }

      fragment =
        (originalTransformation.innerPrefix ?? "") +
        fragment +
        (originalTransformation.innerSuffix ?? "")
      const replacement = reverseTransformedReplacement(
        originalTransformation,
        `<span style="background-color: #eae462" title="${escapeHtml(JSON.stringify(reference), true)}">${fragment}</span>`,
      )
      outputHtml =
        outputHtml.slice(
          0,
          originalTransformation.position.start + outputOffset,
        ) +
        replacement +
        outputHtml.slice(originalTransformation.position.stop + outputOffset)
      outputOffset +=
        replacement.length -
        (originalTransformation.position.stop -
          originalTransformation.position.start)
    }

    await fs.writeFile(outputDocumentPath, outputHtml, { encoding: "utf-8" })
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
