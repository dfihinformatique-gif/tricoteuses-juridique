/**
 * Like script `add_references_to_html_document.ts`, but instead of adding references
 * to ann HTML document, it adds reference informations.
 * Useful for debugging.
 */

import fs from "fs-extra"
import sade from "sade"

import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"
import { escapeHtml } from "$lib/strings.js"
import { iterIncludedReferences } from "$lib/text_parsers/helpers.js"
import {
  iterCitationReferences,
  iterReferences,
} from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  iterOriginalMergedPositionsFromTransformed,
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

    // Since iterators that transform text positions to HTML can't go backward,
    // create 2 iterators:
    // - 1 for references
    // - 1 for refences in citations inside references
    const originalPositionsFromTransformedIterator =
      iterOriginalMergedPositionsFromTransformed(transformation)
    // Initialize iterator by sending a dummy value and ignoring the result.
    originalPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
    const originalPositionsFromTransformedIteratorInCitations =
      iterOriginalMergedPositionsFromTransformed(transformation)
    // Initialize iterator by sending a dummy value and ignoring the result.
    originalPositionsFromTransformedIteratorInCitations.next({
      start: 0,
      stop: 0,
    })

    let output = inputHtml
    let outputOffset = 0

    for await (const reference of iterReferences(context)) {
      const { position } = reference
      const result = originalPositionsFromTransformedIterator.next(position)
      if (result.done) {
        console.error(
          "Transformation of reference position to HTML failed:",
          position,
        )
        process.exit(1)
      }
      const referenceReverseTransformation = result.value
      let fragment = output.slice(
        referenceReverseTransformation.position.start + outputOffset,
        referenceReverseTransformation.position.stop + outputOffset,
      )

      // If fragment contains references in citations, first add HTML markers for these
      // references in the fragment.
      let fragmentOffset = -referenceReverseTransformation.position.start
      for (const includedReference of iterIncludedReferences(reference)) {
        if (includedReference.type === "reference_et_action") {
          const { originalCitations } = includedReference.action
          if (originalCitations !== undefined) {
            for (const citation of originalCitations) {
              for (const citationReference of iterCitationReferences(
                context,
                citation,
              )) {
                const result =
                  originalPositionsFromTransformedIteratorInCitations.next(
                    citationReference.position,
                  )
                if (result.done) {
                  console.error(
                    "Transformation of reference position in citation to HTML failed:",
                    position,
                  )
                  process.exit(1)
                }
                const citationReferenceReverseTransformation = result.value
                let fragmentInFragment = fragment.slice(
                  citationReferenceReverseTransformation.position.start +
                    fragmentOffset,
                  citationReferenceReverseTransformation.position.stop +
                    fragmentOffset,
                )
                fragmentInFragment =
                  (citationReferenceReverseTransformation.innerPrefix ?? "") +
                  fragmentInFragment +
                  (citationReferenceReverseTransformation.innerSuffix ?? "")
                const replacement = `${citationReferenceReverseTransformation.outerPrefix ?? ""}<span style="background-color: #00ff00" title="${escapeHtml(JSON.stringify(citationReference), true)}">${fragmentInFragment}</span>${citationReferenceReverseTransformation.outerSuffix ?? ""}`
                fragment =
                  fragment.slice(
                    0,
                    citationReferenceReverseTransformation.position.start +
                      fragmentOffset,
                  ) +
                  replacement +
                  fragment.slice(
                    citationReferenceReverseTransformation.position.stop +
                      fragmentOffset,
                  )
                fragmentOffset +=
                  replacement.length -
                  (citationReferenceReverseTransformation.position.stop -
                    citationReferenceReverseTransformation.position.start)
              }
            }
          }
        }
      }

      fragment =
        (referenceReverseTransformation.innerPrefix ?? "") +
        fragment +
        (referenceReverseTransformation.innerSuffix ?? "")
      const replacement = `${referenceReverseTransformation.outerPrefix ?? ""}<span style="background-color: #eae462" title="${escapeHtml(JSON.stringify(reference), true)}">${fragment}</span>${referenceReverseTransformation.outerSuffix ?? ""}`
      output =
        output.slice(
          0,
          referenceReverseTransformation.position.start + outputOffset,
        ) +
        replacement +
        output.slice(
          referenceReverseTransformation.position.stop + outputOffset,
        )
      outputOffset +=
        replacement.length -
        (referenceReverseTransformation.position.stop -
          referenceReverseTransformation.position.start)
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
