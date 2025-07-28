import { assertNever } from "./asserts.js"
import type { TextPosition } from "./text_parsers/ast.js"

export interface Conversion {
  task: ConversionTask
  text: string
}

export type ConversionTask = ConversionTaskLeaf | ConversionTaskNode

export interface ConversionTaskLeaf {
  sourceMap: SourceMapSegment[]
  title: string
}

export interface ConversionTaskNode {
  tasks: ConversionTask[]
  title: string
}

export type Converter = (text: string) => Conversion

interface SourceMapSegment {
  inputIndex: number
  inputLength: number
  matchingSegmentIndex?: number
  outputIndex: number
  outputLength: number
}

const characterByNamedHtmlEntity: Record<string, string> = {
  amp: "&",
  apos: "'",
  asymp: "≈",
  copy: "©",
  deg: "°",
  euro: "€",
  gt: ">",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  ne: "≠",
  pound: "£",
  quot: '"',
  reg: "®",
  trade: "™",
}

export function chainSimplifiers(
  title: string,
  simplifiers: Array<(text: string) => Conversion>,
): Converter {
  return (text: string): Conversion => {
    const tasks: ConversionTask[] = []
    for (const simplifier of simplifiers) {
      const conversion = simplifier(text)
      if (
        (conversion.task as ConversionTaskLeaf).sourceMap === undefined ||
        (conversion.task as ConversionTaskLeaf).sourceMap.length !== 0
      ) {
        tasks.push(conversion.task)
        text = conversion.text
      }
    }
    return {
      task: { tasks, title },
      text,
    }
  }
}

export function convertHtmlElementsToText({
  removeAWithHref,
}: {
  removeAWithHref?: boolean
} = {}): Converter {
  return (inputText: string): Conversion => {
    let inputIndex = 0
    let outputOffset = 0
    let outputFragments: string[] = []
    let sourceMap: SourceMapSegment[] = []
    const tagsStack: Array<
      | {
          action?: undefined // Keep element as is.
          name: string
        }
      | {
          action: "ignore"
          inputIndex: number
          name: string
          outputFragments: string[]
          outputOffset: number
          sourceMap: SourceMapSegment[]
        }
      | {
          action: "keep_content"
          closingTagReplacement: string
          name: string
          openingSegmentIndex: number
        }
    > = []
    const title = "Conversion des éléments HTML en texte"
    while (inputIndex < inputText.length) {
      // Find the next tag
      const tagStartIndex = inputText.indexOf("<", inputIndex)

      if (tagStartIndex === -1) {
        // No more tags, keep the remaining text unchanged.
        outputFragments.push(
          inputText.slice(inputIndex).replace(/[\n\r]/g, " "),
        )
        return {
          task: { sourceMap, title },
          text: outputFragments.join(""),
        }
      }

      // Find the end of the tag.
      const tagEndIndex = inputText.indexOf(">", tagStartIndex)
      if (tagEndIndex === -1) {
        // Malformed HTML, just keep the remaining text unchanged.
        outputFragments.push(
          inputText.slice(inputIndex).replace(/[\n\r]/g, " "),
        )
        return {
          task: { sourceMap, title },
          text: outputFragments.join(""),
        }
      }

      const tagContent = inputText.slice(tagStartIndex, tagEndIndex + 1)
      const isClosingTag = tagContent.startsWith("</")
      const tagLength = tagContent.length
      const tagMatch = tagContent.match(/^<\/?(!DOCTYPE|\?XML|[A-Z][A-Z0-9]*)/i)

      if (tagMatch === null) {
        // Not a standard tag. Keep it as normal text.
        outputFragments.push(
          inputText.slice(inputIndex, tagEndIndex + 1).replace(/[\n\r]/g, " "),
        )
        inputIndex = tagEndIndex + 1
        continue
      }

      const tagName = tagMatch[1]
      const tagNameUpperCase = tagName.toUpperCase()
      const isSelfClosingTag =
        tagContent.endsWith("/>") ||
        [
          "!DOCTYPE",
          "?XML",
          "AREA",
          "BASE",
          "BR",
          "COL",
          "EMBED",
          "HR",
          "IMG",
          "INPUT",
          "LINK",
          "META",
          "PARAM",
          "SOURCE",
          "TRACK",
          "WBR",
        ].includes(tagNameUpperCase)

      if (isSelfClosingTag) {
        if (isClosingTag) {
          // A self-closing tag should never be a closing tag.
          // => Remove this invalid tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 0,
          })
          outputOffset -= tagLength
        } else if (["BR", "HR"].includes(tagNameUpperCase)) {
          // Replace self-closing tag with a new line.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Replace self-closing tag with new line.
          const tagLength = tagEndIndex + 1 - tagStartIndex
          outputFragments.push("\n")
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 1,
          })
          outputOffset += 1 - tagLength
        } else if (
          ["!DOCTYPE", "?XML", "COL", "IMG", "INPUT"].includes(tagNameUpperCase)
        ) {
          // Remove self-closing tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 0,
          })
          outputOffset -= tagLength
        } else {
          // Keep self-closing tag (and the text before tag).
          outputFragments.push(
            inputText
              .slice(inputIndex, tagEndIndex + 1)
              .replace(/[\n\r]/g, " "),
          )
        }
      } else {
        // Not a self-closing tag

        if (isClosingTag) {
          const tagInfos = tagsStack.at(-1)
          if (tagNameUpperCase === tagInfos?.name) {
            // Closing tag match last open tag.

            tagsStack.pop()
            switch (tagInfos.action) {
              case undefined: {
                // Keep the text before closing tag and the closing tag as is.
                outputFragments.push(
                  inputText
                    .slice(inputIndex, tagEndIndex + 1)
                    .replace(/[\n\r]/g, " "),
                )
                break
              }

              case "ignore": {
                // Restore outputFragments, outputOffset & sourceMap, because
                // every changes made inside ignored element must be ignored.
                outputFragments = tagInfos.outputFragments
                outputOffset = tagInfos.outputOffset
                sourceMap = tagInfos.sourceMap
                // Remove element and its content.
                const elementLength = tagEndIndex + 1 - tagInfos.inputIndex
                sourceMap.push({
                  inputIndex: tagInfos.inputIndex,
                  inputLength: elementLength,
                  outputIndex: tagInfos.inputIndex + outputOffset,
                  outputLength: 0,
                })
                outputOffset = outputOffset - elementLength
                break
              }

              case "keep_content": {
                // Keep the text before closing tag as is, and replace closing tag.

                outputFragments.push(
                  inputText
                    .slice(inputIndex, tagStartIndex)
                    .replace(/[\n\r]/g, " "),
                )
                if (tagInfos.closingTagReplacement.length !== 0) {
                  outputFragments.push(tagInfos.closingTagReplacement)
                }
                const tagLength = tagEndIndex + 1 - tagStartIndex
                sourceMap[tagInfos.openingSegmentIndex!].matchingSegmentIndex =
                  sourceMap.length
                sourceMap.push({
                  inputIndex: tagStartIndex,
                  inputLength: tagLength,
                  matchingSegmentIndex: tagInfos.openingSegmentIndex,
                  outputIndex: tagStartIndex + outputOffset,
                  outputLength: tagInfos.closingTagReplacement.length,
                })
                outputOffset +=
                  tagInfos.closingTagReplacement.length - tagLength
                break
              }

              default: {
                assertNever("TagInfos.action", tagInfos)
              }
            }
          } else {
            // Closing tag doesn't match last open tag.
            // => Remove closing tag.

            if (tagStartIndex > inputIndex) {
              // Keep the text before closing tag as is.
              outputFragments.push(
                inputText
                  .slice(inputIndex, tagStartIndex)
                  .replace(/[\n\r]/g, " "),
              )
            }
            sourceMap.push({
              inputIndex: tagStartIndex,
              inputLength: tagLength,
              outputIndex: tagStartIndex + outputOffset,
              outputLength: 0,
            })
            outputOffset -= tagLength
          }
        } else if (
          ["COLGROUP", "HEAD", "SCRIPT", "STYLE"].includes(tagNameUpperCase) ||
          (removeAWithHref &&
            tagNameUpperCase === "A" &&
            / href=/i.test(tagContent))
        ) {
          // Ignore opening tag, its content and closing tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          tagsStack.push({
            action: "ignore",
            inputIndex: tagStartIndex,
            name: tagNameUpperCase,
            // Backup outputFragments, outputOffset & sourceMap, because
            // every changes made inside ignored element will be ignored.
            outputFragments,
            outputOffset,
            sourceMap,
          })
          outputFragments = []
          sourceMap = []
        } else if (
          [
            "A", // When removeAWithHref is false or no href
            "B",
            "BODY",
            "DL",
            "EM",
            "HTML",
            "I",
            "OL",
            "SPAN",
            "STRONG",
            "SUB",
            "SUP",
            "TABLE",
            "TBODY",
            "THEAD",
            "TR",
            "UL",
          ].includes(tagNameUpperCase)
        ) {
          // Ignore opening tag & closing tag, but keep element content.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Skip opening tag.
          const openingSegmentIndex = sourceMap.length
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 0,
          })
          outputOffset -= tagLength

          tagsStack.push({
            action: "keep_content",
            closingTagReplacement: "",
            name: tagNameUpperCase,
            openingSegmentIndex,
          })
        } else if (
          [
            "CAPTION",
            "DD",
            "DT",
            "H1",
            "H2",
            "H3",
            "H4",
            "H5",
            "H6",
            "DIV",
            "FORM",
            "LI",
            "P",
            "TD",
            "TH",
          ].includes(tagNameUpperCase)
        ) {
          // Replace both opening tag & closing tag with a new line and keep element content.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .slice(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Replace opening tag with new line.
          outputFragments.push("\n")
          const openingSegmentIndex = sourceMap.length
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 1,
          })
          outputOffset += 1 - tagLength

          tagsStack.push({
            action: "keep_content",
            closingTagReplacement: "\n",
            name: tagNameUpperCase,
            openingSegmentIndex,
          })
        } else {
          // Preserve opening tag.

          outputFragments.push(
            inputText
              .slice(inputIndex, tagEndIndex + 1)
              .replace(/[\n\r]/g, " "),
          )
          tagsStack.push({
            name: tagNameUpperCase,
          })
        }
      }
      inputIndex = tagEndIndex + 1
    }

    return {
      task: { sourceMap, title },
      text: outputFragments.join(""),
    }
  }
}

export function decodeNamedHtmlEntities(text: string): Conversion {
  let outputOffset = 0
  const sourceMap: SourceMapSegment[] = []
  // Decode decimal (e.g., &#65;) or hexadecimal references (e.g., &#x4a;).
  text = text.replace(
    /&(amp|apos|asymp|copy|deg|euro|gt|lt|mdash|nbsp|ndash|ne|pound|quot|reg|trade);/gi,
    (slice, name, inputIndex: number) => {
      const replacement = characterByNamedHtmlEntity[
        (name as string).toLowerCase()
      ] as string
      sourceMap.push({
        inputIndex,
        inputLength: slice.length,
        outputIndex: inputIndex + outputOffset,
        outputLength: replacement.length,
      })
      outputOffset += replacement.length - slice.length
      return replacement
    },
  )
  return {
    task: {
      sourceMap,
      title: "Décodage des entités HTML nommées",
    },
    text,
  }
}

export function decodeNumericHtmlEntities(text: string): Conversion {
  let outputOffset = 0
  const sourceMap: SourceMapSegment[] = []
  // Decode decimal (e.g., &#65;) or hexadecimal references (e.g., &#x4a;).
  text = text.replace(
    /&#(?:(\d+)|x([0-9A-F]+));/gi,
    (slice, decimalString, hexdecimalString, inputIndex: number) => {
      const charCode = parseInt(
        decimalString ?? hexdecimalString,
        decimalString === undefined ? 16 : 10,
      )
      const replacement = String.fromCharCode(charCode)
      sourceMap.push({
        inputIndex,
        inputLength: slice.length,
        outputIndex: inputIndex + outputOffset,
        outputLength: replacement.length,
      })
      outputOffset += replacement.length - slice.length
      return replacement
    },
  )
  return {
    task: {
      sourceMap,
      title: "Décodage des entités HTML numériques",
    },
    text,
  }
}

export function* iterConversionTaskSourceMaps(
  task: ConversionTask,
): Generator<SourceMapSegment[], void> {
  if ((task as ConversionTaskNode).tasks === undefined) {
    yield (task as ConversionTaskLeaf).sourceMap
  } else {
    for (const subTask of (task as ConversionTaskNode).tasks) {
      yield* iterConversionTaskSourceMaps(subTask)
    }
  }
}

/**
 * Caution: This iterator fails when successive original positions overalp.
 */
export function* iterOriginalPositionsFromSimplified(
  task: ConversionTask,
): Generator<TextPosition, void, TextPosition | undefined> {
  const sourceMaps = [...iterConversionTaskSourceMaps(task)].reverse()
  let position: TextPosition | undefined = { start: 0, stop: 0 }
  const sourceMapsIterators = sourceMaps.map((sourceMap) => {
    const sourceMapIterator =
      iterOriginalPositionsFromSimplifiedUsingSourceMap(sourceMap)
    // Launch iterator using a dummy position and ignore the result.
    sourceMapIterator.next(position)
    return sourceMapIterator
  })
  // Send a dummy value and ask for the first position.
  position = yield position
  while (position !== undefined) {
    for (const sourceMapIterator of sourceMapsIterators) {
      const result = sourceMapIterator.next(position)
      if (result.done) {
        return
      }
      position = result.value
    }
    position = yield position
  }
  // Stop the sourceMapsIterators.
  for (const sourceMapIterator of sourceMapsIterators) {
    sourceMapIterator.next(undefined)
  }
}

/**
 * Caution: This iterator fails when successive original positions overalp.
 */
export function* iterOriginalPositionsFromSimplifiedUsingSourceMap(
  sourceMap: SourceMapSegment[],
): Generator<TextPosition, void, TextPosition | undefined> {
  let startSegmentIndex: number | undefined = undefined
  let state: "looking_for_start_segment" | "looking_for_stop_segment" =
    "looking_for_start_segment"
  let simplifiedPosition: TextPosition | undefined = yield {
    start: 0,
    stop: 0,
  }

  // Insert empty segment at start & end.
  sourceMap = [
    { inputIndex: 0, inputLength: 0, outputIndex: 0, outputLength: 0 },
    ...sourceMap,
    {
      inputIndex: Number.MAX_SAFE_INTEGER,
      inputLength: 0,
      outputIndex: Number.MAX_SAFE_INTEGER,
      outputLength: 0,
    },
  ]
  for (const [segmentIndex, segment] of sourceMap.entries()) {
    for (let changeSegment = false; !changeSegment; ) {
      if (simplifiedPosition === undefined) {
        return
      }
      switch (state) {
        case "looking_for_start_segment": {
          const nextSegment = sourceMap[segmentIndex + 1]
          if (
            nextSegment !== undefined &&
            nextSegment.outputIndex + nextSegment.outputLength <=
              simplifiedPosition.start
          ) {
            changeSegment = true
          } else {
            startSegmentIndex = segmentIndex
            state = "looking_for_stop_segment"
          }
          break
        }

        case "looking_for_stop_segment": {
          if (segment.outputIndex < simplifiedPosition.stop) {
            changeSegment = true
          } else {
            const startSegment = sourceMap[startSegmentIndex!]
            const stopSegmentIndex = segmentIndex
            const stopSegment = segment

            // If opening or closing segments are missing, include them.
            let firstIncludedSegmentIndex =
              simplifiedPosition.start <
              startSegment.outputIndex + startSegment.outputLength
                ? startSegmentIndex!
                : startSegmentIndex! + 1
            let lastIncludedSegmentIndex =
              simplifiedPosition.stop > stopSegment.outputIndex
                ? stopSegmentIndex
                : stopSegmentIndex - 1
            for (let areaExtended = true; areaExtended; ) {
              areaExtended = false
              for (
                let includedSegmentIndex = firstIncludedSegmentIndex;
                includedSegmentIndex <= lastIncludedSegmentIndex;
                includedSegmentIndex++
              ) {
                const matchingSegmentIndex =
                  sourceMap[includedSegmentIndex].matchingSegmentIndex
                if (matchingSegmentIndex !== undefined) {
                  // Note: Add 1 to matchingSegmentIndex, because of empty segment
                  // inserted at start of source map.
                  if (matchingSegmentIndex + 1 < firstIncludedSegmentIndex) {
                    firstIncludedSegmentIndex = matchingSegmentIndex + 1
                    // Extend simplifiedPosition to include added segment.
                    simplifiedPosition = {
                      start: sourceMap[firstIncludedSegmentIndex].outputIndex,
                      stop: simplifiedPosition.stop,
                    }
                    areaExtended = true
                    break
                  }
                  if (matchingSegmentIndex + 1 > lastIncludedSegmentIndex) {
                    lastIncludedSegmentIndex = matchingSegmentIndex + 1
                    // Extend simplifiedPosition to include added segment.
                    const lastIncludedSegment =
                      sourceMap[lastIncludedSegmentIndex]
                    simplifiedPosition = {
                      start: simplifiedPosition.start,
                      stop:
                        lastIncludedSegment.outputIndex +
                        lastIncludedSegment.outputLength,
                    }
                    areaExtended = true
                    break
                  }
                }
              }
            }

            const segmentBefore = sourceMap[firstIncludedSegmentIndex - 1]
            const originalStart =
              segmentBefore.inputIndex +
              segmentBefore.inputLength +
              simplifiedPosition.start -
              (segmentBefore.outputIndex + segmentBefore.outputLength)

            const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
            const originalStop =
              lastIncludedSegment.inputIndex +
              lastIncludedSegment.inputLength +
              simplifiedPosition.stop -
              (lastIncludedSegment.outputIndex +
                lastIncludedSegment.outputLength)

            simplifiedPosition = yield {
              start: originalStart,
              stop: originalStop,
            }
            state = "looking_for_start_segment"
          }
          break
        }

        default: {
          assertNever(
            "iterOriginalPositionsFromSimplifiedUsingSourceMap.state",
            state,
          )
        }
      }
    }
  }
}

/**
 * Note: The original positions are split when they overlap.
 * So, there may be more original positions than simplified positions.
 */
export function originalPositionsFromSimplified(
  task: ConversionTask,
  positions: TextPosition[],
): TextPosition[] {
  for (const sourceMap of [...iterConversionTaskSourceMaps(task)].reverse()) {
    positions = originalPositionsFromSimplifiedUsingSourceMap(
      sourceMap,
      positions,
    )
  }
  return positions
}

/**
 * Note: The original positions are split when they overlap.
 * So, there may be more original positions than simplified positions.
 */
export function originalPositionsFromSimplifiedUsingSourceMap(
  sourceMap: SourceMapSegment[],
  simplifiedPositions: TextPosition[],
): TextPosition[] {
  const originalPositions: TextPosition[] = []
  // Insert empty segment at start & end.
  sourceMap = [
    { inputIndex: 0, inputLength: 0, outputIndex: 0, outputLength: 0 },
    ...sourceMap,
    {
      inputIndex: Number.MAX_SAFE_INTEGER,
      inputLength: 0,
      outputIndex: Number.MAX_SAFE_INTEGER,
      outputLength: 0,
    },
  ]
  let segmentIndex = 0
  let segment = sourceMap[segmentIndex]
  for (const simplifiedPosition of simplifiedPositions) {
    let { start: simplifiedStart } = simplifiedPosition
    const { stop: simplifiedStop } = simplifiedPosition

    convertPosition: for (
      let simplifiedPositionConverted = false;
      !simplifiedPositionConverted;

    ) {
      for (
        ;
        segment.outputIndex + segment.outputLength <= simplifiedStart;
        segmentIndex++, segment = sourceMap[segmentIndex]
      );
      let firstIncludedSegmentIndex = segmentIndex
      const segmentBefore = sourceMap[firstIncludedSegmentIndex - 1]
      let originalStart =
        segmentBefore.inputIndex +
        segmentBefore.inputLength +
        simplifiedStart -
        (segmentBefore.outputIndex + segmentBefore.outputLength)

      let lastIncludedSegmentIndex: number
      for (
        lastIncludedSegmentIndex = firstIncludedSegmentIndex - 1;
        sourceMap[lastIncludedSegmentIndex + 1].outputIndex < simplifiedStop;
        lastIncludedSegmentIndex++
      );
      const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
      let originalStop =
        lastIncludedSegment.inputIndex +
        lastIncludedSegment.inputLength +
        simplifiedStop -
        (lastIncludedSegment.outputIndex + lastIncludedSegment.outputLength)

      for (
        let includedSegmentIndex = firstIncludedSegmentIndex;
        includedSegmentIndex <= lastIncludedSegmentIndex;
        includedSegmentIndex++
      ) {
        const includedSegment = sourceMap[includedSegmentIndex]
        const matchingSegmentIndex = includedSegment.matchingSegmentIndex
        if (matchingSegmentIndex !== undefined) {
          // Note: Add 1 to matchingSegmentIndex, because of empty segment
          // inserted at start of source map.
          if (matchingSegmentIndex + 1 < firstIncludedSegmentIndex) {
            const matchingSegment = sourceMap[matchingSegmentIndex + 1]
            if (matchingSegment.outputIndex < simplifiedStart) {
              // Split simplified position.
              if (includedSegment.inputIndex > originalStart) {
                originalPositions.push({
                  start: originalStart,
                  stop: includedSegment.inputIndex,
                })
              }
              simplifiedStart =
                includedSegment.outputIndex + includedSegment.outputLength
              // Ignore following segments whose output are empty.
              for (
                let nextSegmentIndex = includedSegmentIndex,
                  nextSegment = includedSegment;
                nextSegment.outputIndex + nextSegment.outputLength ===
                simplifiedStart;
                nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
              ) {
                segmentIndex = nextSegmentIndex
              }
              // Handle remaining split position.
              continue convertPosition
            }
            firstIncludedSegmentIndex = matchingSegmentIndex + 1
            originalStart = matchingSegment.inputIndex
          } else if (matchingSegmentIndex + 1 > lastIncludedSegmentIndex) {
            const matchingSegment = sourceMap[matchingSegmentIndex + 1]
            if (
              matchingSegment.outputIndex + matchingSegment.outputLength >
              simplifiedStop
            ) {
              // Split simplified position.
              if (includedSegment.inputIndex > originalStart) {
                originalPositions.push({
                  start: originalStart,
                  stop: includedSegment.inputIndex,
                })
              }
              simplifiedStart =
                includedSegment.outputIndex + includedSegment.outputLength
              // Ignore following segments whose output are empty.
              for (
                let nextSegmentIndex = includedSegmentIndex,
                  nextSegment = includedSegment;
                nextSegment.outputIndex + nextSegment.outputLength ===
                simplifiedStart;
                nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
              ) {
                segmentIndex = nextSegmentIndex
              }
              // Handle remaining split position.
              continue convertPosition
            }
            lastIncludedSegmentIndex = matchingSegmentIndex + 1
            originalStop =
              matchingSegment.inputIndex + matchingSegment.inputLength
          }
        }
      }
      originalPositions.push({
        start: originalStart,
        stop: originalStop,
      })
      simplifiedPositionConverted = true
    }
  }
  return originalPositions
}

export function replacePattern(
  pattern: RegExp | string,
  replacement: string,
): Converter {
  return (text: string): Conversion => {
    const sourceMap: SourceMapSegment[] = []
    text = text.replaceAll(pattern, (slice, ...rest) => {
      const inputIndex: number = rest.at(-2)
      let expandedReplacement = replacement
      for (const [index, p] of rest.slice(0, -2).entries()) {
        expandedReplacement = expandedReplacement.replaceAll(`$${index + 1}`, p)
      }
      sourceMap.push({
        inputIndex,
        inputLength: slice.length,
        // Note: `outputIndex` is added below.
        outputLength: expandedReplacement.length,
      } as SourceMapSegment)
      return expandedReplacement
    })

    // Add missing attribute `outputIndex` to each sourceMap segment.
    let outputOffset = 0
    for (const sourceMapSegment of sourceMap) {
      sourceMapSegment.outputIndex = sourceMapSegment.inputIndex + outputOffset
      outputOffset +=
        sourceMapSegment.outputLength - sourceMapSegment.inputLength
    }

    return {
      task: {
        sourceMap,
        title: `Remplacement de ${pattern} par ${JSON.stringify(replacement)}`,
      },
      text,
    }
  }
}

export function replacePatterns(text: string): Conversion {
  const tasks: ConversionTask[] = []
  for (const [pattern, replacement] of [
    // Note: The most englobing patterns must be first.

    // Remove HTML comment.
    [/<!--.*?-->/gs, ""],
    // Remove <script> element.
    [/<script.*?>.*?<\/script>/gis, ""],
    // Remove <script> element.
    [/<style.*?>.*?<\/style>/gis, ""],
    // Ensure that there is always a space after "n°".
    [/(\sn°)([^\s])/gi, "$1 $2"],
    // Remove Sénat "pastillage":
    // - \uF04B-\uF054 are circled numbers 0-9.
    // - \uF031-\uF039 are left-half circled numbers 1-9.
    // - \uF041-\uF04A are numbers 0-9 with a circle fragment on their top & bottom only.
    // - \uF061-\uF06A are right-half circled numbers 0-9.
    [/[\uF031-\uF039\uF041-\uF054\uF061-\uF06A]/g, ""],
  ] as Array<[RegExp | string, string]>) {
    const conversion = replacePattern(pattern, replacement)(text)
    if (
      (conversion.task as ConversionTaskLeaf).sourceMap === undefined ||
      (conversion.task as ConversionTaskLeaf).sourceMap.length !== 0
    ) {
      tasks.push(conversion.task)
      text = conversion.text
    }
  }
  return {
    task: {
      tasks,
      title:
        "Suppression des commentaires, scripts et styles HTML et nettoyage d'expressions",
    },
    text,
  }
}

export function simplifyHtml({
  removeAWithHref,
}: { removeAWithHref?: boolean } = {}): Converter {
  return (text: string): Conversion =>
    chainSimplifiers("Simplification du HTML", [
      decodeNamedHtmlEntities,
      decodeNumericHtmlEntities,
      replacePatterns,
      simplifyUnicodeCharacters,
      convertHtmlElementsToText({ removeAWithHref }),
      simplifyText,
    ])(text)
}

export function simplifyText(text: string): Conversion {
  const tasks: ConversionTask[] = []

  for (const [title, pattern, replacement] of [
    ["Remplacement des espaces multiples pas une espace unique", /  +/g, " "],
    ["Suppression d'une espace en début de ligne", /^ /gm, ""],
    ["Suppression d'une espace en fin de ligne", / $/gm, ""],
    [
      "Remplacement des sauts de lignes multiples par un saut de ligne unique",
      /\n\n+/g,
      "\n",
    ],
    ["Suppression d'un saut de ligne en début de texte", /^\n/g, ""],
    ["Suppression d'un saut de ligne en fin de texte", /\n$/g, ""],
  ] as Array<[string, RegExp | string, string]>) {
    let outputOffset = 0
    const sourceMap: SourceMapSegment[] = []
    text = text.replaceAll(pattern, (slice, ...rest) => {
      const inputIndex: number = rest.at(-2)
      let expandedReplacement = replacement
      for (const [index, p] of rest.slice(0, -2).entries()) {
        expandedReplacement = expandedReplacement.replaceAll(`$${index + 1}`, p)
      }
      sourceMap.push({
        inputIndex,
        inputLength: slice.length,
        outputIndex: inputIndex + outputOffset,
        outputLength: expandedReplacement.length,
      })
      outputOffset += expandedReplacement.length - slice.length
      return expandedReplacement
    })
    if (sourceMap.length !== 0) {
      tasks.push({
        sourceMap,
        title,
      })
    }
  }

  return {
    task: {
      tasks,
      title: "Simplification du texte",
    },
    text,
  }
}

export function simplifyUnicodeCharacters(text: string): Conversion {
  const sourceMap: SourceMapSegment[] = []
  for (const [pattern, replacement] of [
    // Replace U+00A0 (no-break space) and tab with a normal space.
    [/[ \t]/g, " "],
    // Replace three non-ASCII dashes (U+2010, U+2011 et U+2013) with a minus sign.
    [/[‐‑–]/g, "-"],
    // Replace non-ASCII apostrophe.
    [/’/g, "'"],
    // Replace İ (I with a point) with normal I.
    // The İ can be used, probably to differentiate the letter I from the Roman numeral I.
    // For example: Article 199 decies İ of the General Tax Code.
    // But Légifrance uses a classic I…
    ["İ", "I"],
  ] as Array<[RegExp | string, string]>) {
    text = text.replaceAll(pattern, (slice, ...rest) => {
      const inputIndex: number = rest.at(-2)
      const sourceMapSegment: SourceMapSegment = {
        inputIndex,
        inputLength: 1,
        outputIndex: inputIndex,
        // Note: `outputIndex` is added below.
        outputLength: 1,
      } as SourceMapSegment
      const nextSourceMapSegmentIndex = sourceMap.findIndex(
        (segment) => segment.inputIndex > inputIndex,
      )
      if (nextSourceMapSegmentIndex === -1) {
        sourceMap.push(sourceMapSegment)
      } else {
        sourceMap.splice(nextSourceMapSegmentIndex, 0, sourceMapSegment)
      }
      return replacement
    })
  }

  // Add missing attribute `outputIndex` to each sourceMap segment.
  let outputOffset = 0
  for (const sourceMapSegment of sourceMap) {
    sourceMapSegment.outputIndex = sourceMapSegment.inputIndex + outputOffset
    outputOffset += sourceMapSegment.outputLength - sourceMapSegment.inputLength
  }

  return {
    task: {
      sourceMap,
      title: "Simplification des caractères unicodes",
    },
    text,
  }
}
