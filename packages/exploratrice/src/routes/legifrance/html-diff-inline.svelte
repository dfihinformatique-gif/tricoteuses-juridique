<script lang="ts">
  import {
    assertNever,
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
  ): string => {
    const currentTransformation = simplifyHtml()(currentHtml)
    const currentText = currentTransformation.output

    const previousTransformation = simplifyHtml()(previousHtml)
    const previousText = previousTransformation.output

    const changes = diffWords(previousText, currentText, {
      // ignoreCase,
      // intlSegmenter,
    })

    let currentTextIndex = 0
    let previousTextIndex = 0
    const textPositions: Array<
      | {
          currentPositions: FragmentPosition[]
          previousIndex: number
          source: "current"
        }
      | {
          currentIndex: number
          previousPositions: FragmentPosition[]
          source: "previous"
        }
    > = []
    for (const change of changes) {
      const changeLength = change.value.length
      if (change.added) {
        const changeStop = currentTextIndex + changeLength
        const currentPositions: FragmentPosition[] = []
        textPositions.push({
          currentPositions,
          previousIndex: previousTextIndex,
          source: "current",
        })
        let start = currentTextIndex
        for (let i = currentTextIndex; i < changeStop; i++) {
          if (currentText[i] === "\n") {
            if (i > start) {
              currentPositions.push({
                start,
                stop: i,
              })
              start = i + 1
            }
          }
        }
        if (start < changeStop) {
          currentPositions.push({
            start,
            stop: changeStop,
          })
        }
        currentTextIndex += changeLength // - (changeEndsWithLineFeed ? 1 : 0);
      } else if (change.removed) {
        const changeStop = previousTextIndex + changeLength
        const previousPositions: FragmentPosition[] = []
        textPositions.push({
          currentIndex: currentTextIndex,
          previousPositions,
          source: "previous",
        })
        let start = previousTextIndex
        for (let i = previousTextIndex; i < changeStop; i++) {
          if (previousText[i] === "\n") {
            if (i > start) {
              previousPositions.push({
                start,
                stop: i,
              })
              start = i + 1
            }
          }
        }
        if (start < changeStop) {
          previousPositions.push({
            start,
            stop: changeStop,
          })
        }
        previousTextIndex += changeLength // - (changeEndsWithLineFeed ? 1 : 0);
      } else {
        previousTextIndex += changeLength
        currentTextIndex += changeLength
      }
    }

    const currentHtmlPositions = reversePositionsSplitFromPositions(
      currentTransformation,
      textPositions.map((textPositionForChange) =>
        textPositionForChange.source === "previous"
          ? [
              {
                start: textPositionForChange.currentIndex,
                stop: textPositionForChange.currentIndex,
              },
            ]
          : textPositionForChange.currentPositions,
      ),
    )
    const previousHtmlPositions = reversePositionsSplitFromPositions(
      previousTransformation,
      textPositions.map((textPositionForChange) =>
        textPositionForChange.source === "current"
          ? [
              {
                start: textPositionForChange.previousIndex,
                stop: textPositionForChange.previousIndex,
              },
            ]
          : textPositionForChange.previousPositions,
      ),
    )
    let currentHtmlIndex = 0
    const htmlFragments: string[] = []
    let previousHtmlIndex = 0
    for (const [
      changeIndex,
      textPositionsForChange,
    ] of textPositions.entries()) {
      switch (textPositionsForChange.source) {
        case "current": {
          const previousHtmlPosition = previousHtmlPositions[changeIndex][0]
          if (previousHtmlPosition.start > previousHtmlIndex) {
            // Text fragment is the same on both previous & current texts.
            htmlFragments.push(
              previousHtml.slice(previousHtmlIndex, previousHtmlPosition.start),
            )
            previousHtmlIndex += previousHtmlPosition.start - previousHtmlIndex
          }
          for (const [i, currentHtmlPosition] of currentHtmlPositions[
            changeIndex
          ].entries()) {
            if (i > 0 && currentHtmlPosition.start > currentHtmlIndex) {
              htmlFragments.push(
                currentHtml.slice(currentHtmlIndex, currentHtmlPosition.start),
              )
            }
            const currentOriginalHtmlFragment = currentHtml.slice(
              currentHtmlPosition.start,
              currentHtmlPosition.stop,
            )
            const currentModifiedHtmlFragment = `<ins style="background-color: oklch(87.1% 0.15 154.449) !important">${currentOriginalHtmlFragment}</ins>`
            htmlFragments.push(currentModifiedHtmlFragment)
            currentHtmlIndex = currentHtmlPosition.stop
          }
          break
        }

        case "previous": {
          const currentHtmlPosition = currentHtmlPositions[changeIndex][0]
          if (currentHtmlPosition.start > currentHtmlIndex) {
            // Text fragment is the same on both previous & current texts.
            currentHtmlIndex += currentHtmlPosition.start - currentHtmlIndex
          }
          for (const previousHtmlPosition of previousHtmlPositions[
            changeIndex
          ]) {
            if (previousHtmlPosition.start > previousHtmlIndex) {
              htmlFragments.push(
                previousHtml.slice(
                  previousHtmlIndex,
                  previousHtmlPosition.start,
                ),
              )
            }
            const previousOriginalHtmlFragment = previousHtml.slice(
              previousHtmlPosition.start,
              previousHtmlPosition.stop,
            )
            const previousModifiedHtmlFragment = `<del style="background-color: oklch(80.8% 0.114 19.571) !important">${previousOriginalHtmlFragment}</del>`
            htmlFragments.push(previousModifiedHtmlFragment)
            previousHtmlIndex = previousHtmlPosition.stop
          }
          break
        }

        default: {
          assertNever(
            "HtmlDiffInline textPositionsForChange.source",
            textPositionsForChange,
          )
        }
      }
    }
    if (previousHtmlIndex < previousHtml.length) {
      htmlFragments.push(previousHtml.slice(previousHtmlIndex))
    }

    return htmlFragments.join("")
  }

  const htmlDiff = $derived(generateHtmlSplitDiff(previousHtml, currentHtml))
</script>

<section class="prose mx-4">
  {@html htmlDiff}
</section>
