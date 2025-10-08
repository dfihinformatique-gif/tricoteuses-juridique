<script lang="ts">
  import { cleanHtmlContenu } from "$lib/strings"
  import {
    iterCitationReferences,
    iterIncludedReferences,
    iterOriginalMergedPositionsFromTransformed,
    iterReferences,
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

    let outputHtml = inputHtml
    let outputOffset = 0

    for await (const reference of iterReferences(context)) {
      const { position } = reference
      const result = originalPositionsFromTransformedIterator.next(position)
      if (result.done) {
        throw new Error(
          `Transformation of reference position to HTML failed: ${position}`,
        )
      }
      const referenceReverseTransformation = result.value
      let fragment = outputHtml.slice(
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
                  throw new Error(
                    `Transformation of reference position in citation to HTML failed: ${position}`,
                  )
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
      outputHtml =
        outputHtml.slice(
          0,
          referenceReverseTransformation.position.start + outputOffset,
        ) +
        replacement +
        outputHtml.slice(
          referenceReverseTransformation.position.stop + outputOffset,
        )
      outputOffset +=
        replacement.length -
        (referenceReverseTransformation.position.stop -
          referenceReverseTransformation.position.start)
    }

    return outputHtml
  }

  const fragmentWithReferences = $derived(
    await generateFragmentWithReferences(fragment),
  )
</script>

{@html cleanHtmlContenu(fragmentWithReferences)}
