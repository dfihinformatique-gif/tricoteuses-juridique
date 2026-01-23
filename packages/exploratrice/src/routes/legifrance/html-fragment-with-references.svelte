<script lang="ts">
  import { cleanHtmlContenu } from "$lib/strings"
  import {
    iterIncludedReferences,
    extractReferencesWithOriginalTransformations,
    reverseTransformedInnerFragment,
    reverseTransformedReplacement,
    simplifyHtml,
    TextParserContext,
  } from "@tricoteuses/tisseuse"

  import { escapeHtml } from "@tricoteuses/legifrance"

  const {
    fragment,
  }: {
    fragment: string
  } = $props()

  const generateFragmentWithReferences = async (
    inputHtml: string,
  ): Promise<string> => {
    const transformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = transformation.output
    const context = new TextParserContext(inputText)

    let outputHtml = inputHtml
    let outputOffset = 0

    for await (const reference of extractReferencesWithOriginalTransformations(
      context,
      transformation,
    )) {
      const { originalTransformation } = reference
      if (originalTransformation === undefined) {
        continue
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
                    continue
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

    return outputHtml
  }

  const fragmentWithReferences = $derived(
    await generateFragmentWithReferences(fragment),
  )
</script>

{@html cleanHtmlContenu(fragmentWithReferences)}
