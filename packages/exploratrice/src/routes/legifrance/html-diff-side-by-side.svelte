<script lang="ts">
  import {
    reversePositionsSplitFromPositions,
    simplifyHtml,
    type FragmentPosition,
  } from "@tricoteuses/tisseuse"
  import { diffWords } from "diff"

  const {
    current: currentHtml,
    previous: previousHtml,
  }: {
    current: string
    previous: string
  } = $props()

  const generateHtmlSplitDiff = (
    previousHtml: string,
    currentHtml: string,
  ): [string, string] => {
    const currentTransformation = simplifyHtml()(currentHtml)
    const currentText = currentTransformation.output

    const previousTransformation = simplifyHtml()(previousHtml)
    const previousText = previousTransformation.output

    const changes = diffWords(previousText, currentText, {
      // ignoreCase,
      // intlSegmenter,
    })

    let currentTextIndex = 0
    const currentTextPositions: FragmentPosition[] = []
    let previousTextIndex = 0
    const previousTextPositions: FragmentPosition[] = []
    for (const change of changes) {
      const changeLength = change.value.length
      if (change.added) {
        const changeStop = currentTextIndex + changeLength
        let start = currentTextIndex
        for (let i = currentTextIndex; i < changeStop; i++) {
          if (currentText[i] === "\n") {
            if (i > start) {
              currentTextPositions.push({
                start,
                stop: i,
              })
            }
            start = i + 1
          }
        }
        if (start < changeStop) {
          currentTextPositions.push({
            start,
            stop: changeStop,
          })
        }
        currentTextIndex += changeLength // - (changeEndsWithLineFeed ? 1 : 0);
      } else if (change.removed) {
        const changeStop = previousTextIndex + changeLength
        let start = previousTextIndex
        for (let i = previousTextIndex; i < changeStop; i++) {
          if (previousText[i] === "\n") {
            if (i > start) {
              previousTextPositions.push({
                start,
                stop: i,
              })
            }
            start = i + 1
          }
        }
        if (start < changeStop) {
          previousTextPositions.push({
            start,
            stop: changeStop,
          })
        }
        previousTextIndex += changeLength
      } else {
        previousTextIndex += changeLength
        currentTextIndex += changeLength
      }
    }

    const previousHtmlPositions = reversePositionsSplitFromPositions(
      previousTransformation,
      previousTextPositions,
    )
    const previousHtmlFragments: string[] = []
    let previousHtmlIndex = 0
    for (const previousHtmlPositionsForTextPosition of previousHtmlPositions) {
      for (const previousHtmlPosition of previousHtmlPositionsForTextPosition) {
        if (previousHtmlPosition.start > previousHtmlIndex) {
          previousHtmlFragments.push(
            previousHtml.slice(previousHtmlIndex, previousHtmlPosition.start),
          )
        }
        const previousOriginalHtmlFragment = previousHtml.slice(
          previousHtmlPosition.start,
          previousHtmlPosition.stop,
        )
        const previousModifiedHtmlFragment = `<del style="background-color: oklch(80.8% 0.114 19.571) !important">${previousOriginalHtmlFragment}</del>`
        previousHtmlFragments.push(previousModifiedHtmlFragment)
        previousHtmlIndex = previousHtmlPosition.stop
      }
    }
    if (previousHtmlIndex < previousHtml.length) {
      previousHtmlFragments.push(previousHtml.slice(previousHtmlIndex))
    }

    const currentHtmlPositions = reversePositionsSplitFromPositions(
      currentTransformation,
      currentTextPositions,
    )
    const currentHtmlFragments: string[] = []
    let currentHtmlIndex = 0
    for (const currentHtmlPositionsForTextPosition of currentHtmlPositions) {
      for (const currentHtmlPosition of currentHtmlPositionsForTextPosition) {
        if (currentHtmlPosition.start > currentHtmlIndex) {
          currentHtmlFragments.push(
            currentHtml.slice(currentHtmlIndex, currentHtmlPosition.start),
          )
        }
        const currentOriginalHtmlFragment = currentHtml.slice(
          currentHtmlPosition.start,
          currentHtmlPosition.stop,
        )
        const currentModifiedHtmlFragment = `<ins style="background-color: oklch(87.1% 0.15 154.449) !important">${currentOriginalHtmlFragment}</ins>`
        currentHtmlFragments.push(currentModifiedHtmlFragment)
        currentHtmlIndex = currentHtmlPosition.stop
      }
    }
    if (currentHtmlIndex < currentHtml.length) {
      currentHtmlFragments.push(currentHtml.slice(currentHtmlIndex))
    }

    return [previousHtmlFragments.join(""), currentHtmlFragments.join("")]
  }

  const [previousHtmlDiff, currentHtmlDiff] = $derived(
    generateHtmlSplitDiff(previousHtml, currentHtml),
  )
</script>

<div class="mx-4 flex space-x-4">
  <section class="prose basis-1/2">
    {@html previousHtmlDiff}
  </section>
  <section class="prose basis-1/2">
    {@html currentHtmlDiff}
  </section>
</div>
