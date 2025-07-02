import { assertNever } from "./asserts.js"

interface ConversionResult {
  sourceMap: SourceMapSegment[]
  text: string
}

interface ConversionStep {
  sourceMap: SourceMapSegment[]
  title: string
}

interface SourceMapSegment {
  inputIndex: number
  inputLength: number
  outputIndex: number
  outputLength: number
}

export function convertHtmlElementsToText(inputText: string): ConversionResult {
  let inputIndex = 0
  let outputOffset = 0
  const outputFragments: string[] = []
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
        outputOffset: number
        sourceMap: SourceMapSegment[]
      }
    | {
        action: "keep_content"
        name: string
      }
  > = []
  while (inputIndex < inputText.length) {
    // Find the next tag
    const tagStartIndex = inputText.indexOf("<", inputIndex)

    if (tagStartIndex === -1) {
      // No more tags, keep the remaining text unchanged.
      outputFragments.push(inputText.substring(inputIndex))
      return {
        sourceMap,
        text: outputFragments.join(""),
      }
    }

    // Find the end of the tag.
    const tagEndIndex = inputText.indexOf(">", tagStartIndex)
    if (tagEndIndex === -1) {
      // Malformed HTML, just keep the remaining text unchanged.
      outputFragments.push(inputText.substring(inputIndex))
      return {
        sourceMap,
        text: outputFragments.join(""),
      }
    }

    const tagContent = inputText.substring(tagStartIndex, tagEndIndex + 1)
    const isClosingTag = tagContent.startsWith("</")
    const tagMatch = tagContent.match(/^<\/?([A-Z][A-Z0-9]*)/i)

    if (tagMatch === null) {
      // Not a standard tag. Keep it as normal text.
      const fragment = inputText.substring(inputIndex, tagEndIndex + 1)
      outputFragments.push(fragment)
      inputIndex = tagEndIndex + 1
      continue
    }

    const tagName = tagMatch[1]
    const tagNameUpperCase = tagName.toUpperCase()
    const isSelfClosingTag =
      tagContent.endsWith("/>") ||
      [
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
          outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
        }
        sourceMap.push({
          inputIndex: tagStartIndex,
          inputLength: tagContent.length,
          outputIndex: tagStartIndex + outputOffset,
          outputLength: 0,
        })
        outputOffset -= tagContent.length
      } else if (["IMG"].includes(tagNameUpperCase)) {
        // Remove self-closing tag.

        if (tagStartIndex > inputIndex) {
          // Keep the text before tag as is.
          outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
        }
        sourceMap.push({
          inputIndex: tagStartIndex,
          inputLength: tagContent.length,
          outputIndex: tagStartIndex + outputOffset,
          outputLength: 0,
        })
        outputOffset -= tagContent.length
      } else {
        // Keep self-closing tag (and the text before tag).
        outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
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
                inputText.substring(inputIndex, tagEndIndex + 1),
              )
              break
            }

            case "ignore": {
              // Restore sourceMap backup, to ignore sourceMap segments
              // added in ignored element.
              sourceMap = tagInfos.sourceMap
              // Remove element and its content.
              const elementLength = tagEndIndex + 1 - tagInfos.inputIndex
              sourceMap.push({
                inputIndex: tagInfos.inputIndex,
                inputLength: elementLength,
                outputIndex: tagInfos.inputIndex + outputOffset,
                outputLength: 0,
              })
              outputOffset = tagInfos.outputOffset - elementLength
              break
            }

            case "keep_content": {
              // Keep the text before closing tag as is, but ignore closing tag.

              outputFragments.push(
                inputText.substring(inputIndex, tagStartIndex),
              )
              const tagLength = tagEndIndex + 1 - tagStartIndex
              sourceMap.push({
                inputIndex: tagStartIndex,
                inputLength: tagLength,
                outputIndex: tagStartIndex + outputOffset,
                outputLength: 0,
              })
              outputOffset -= tagLength
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
            outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
          }
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagContent.length,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 0,
          })
          outputOffset -= tagContent.length
        }
      } else if (
        ["B", "EM", "I", "SPAN", "STRONG"].includes(tagNameUpperCase)
      ) {
        // Ignore opening tag & closing tag, but keep element content.

        if (tagStartIndex > inputIndex) {
          // Keep the text before tag as is.
          outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
        }
        // Skip opening tag.
        const tagLength = tagEndIndex + 1 - tagStartIndex
        sourceMap.push({
          inputIndex: tagStartIndex,
          inputLength: tagLength,
          outputIndex: tagStartIndex + outputOffset,
          outputLength: 0,
        })
        outputOffset -= tagLength

        tagsStack.push({
          action: "keep_content",
          name: tagNameUpperCase,
        })
      } else if (["SCRIPT", "STYLE"].includes(tagNameUpperCase)) {
        // Ignore opening tag, its contentand closing tag.

        if (tagStartIndex > inputIndex) {
          // Keep the text before tag as is.
          outputFragments.push(inputText.substring(inputIndex, tagStartIndex))
        }
        tagsStack.push({
          action: "ignore",
          inputIndex: tagStartIndex,
          name: tagNameUpperCase,
          // Backup outputOffset & sourceMap, because every changes made
          // inside ignored element will be ignored.
          outputOffset,
          sourceMap,
        })
        sourceMap = []
      } else {
        // Preserve opening tag.

        outputFragments.push(inputText.substring(inputIndex, tagEndIndex + 1))
        tagsStack.push({
          name: tagNameUpperCase,
        })
      }
    }
    inputIndex = tagEndIndex + 1
  }

  return {
    sourceMap,
    text: outputFragments.join(""),
  }
}

export function decodeNumericHtmlEntities(text: string): ConversionResult {
  let outputOffset = 0
  const sourceMap: SourceMapSegment[] = []
  // Decode decimal (e.g., &#65;) or hexadecimal references (e.g., &#x4a;).
  text = text.replace(
    /&#(?:(\d+)|x([0-9A-F]+));/gi,
    (substring, decimalString, hexdecimalString, inputIndex: number) => {
      const charCode = parseInt(
        decimalString ?? hexdecimalString,
        decimalString === undefined ? 16 : 10,
      )
      const replacement = String.fromCharCode(charCode)
      sourceMap.push({
        inputIndex,
        inputLength: substring.length,
        outputIndex: inputIndex + outputOffset,
        outputLength: replacement.length,
      })
      outputOffset += replacement.length - substring.length
      return replacement
    },
  )
  return {
    sourceMap,
    text,
  }
}

export function replacePatterns(text: string): ConversionResult {
  const sourceMap: SourceMapSegment[] = []
  for (const [pattern, replacement] of [
    // Note: The most englobing patterns must be first.

    // Remove HTML comment
    [/<!--.*?-->/g, ""],
    // Replace U+00A0 (no-break space) and tab with a normal space.
    [/ \t/g, " "],
    // Replace three non-ASCII dashes (U+2010, U+2011 et U+2013) with a minus sign.
    [/[‐‑–]/g, "-"],
    // Replace İ (I with a point) with normal I.
    // The İ can be used, probably to differentiate the letter I from the Roman numeral I.
    // For example: Article 199 decies İ of the General Tax Code.
    // But Légifrance uses a classic I…
    ["İ", "I"],
  ] as Array<[RegExp | string, string]>) {
    text = text.replaceAll(pattern, (substring, inputIndex: number) => {
      const sourceMapSegment: SourceMapSegment = {
        inputIndex,
        inputLength: substring.length,
        // Note: `outputIndex` is added below.
        outputLength: replacement.length,
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
    sourceMap,
    text,
  }
}

export function simplifyHtml(text: string): {
  steps: ConversionStep[]
  text: string
} {
  const steps: ConversionStep[] = []

  let conversion = decodeNumericHtmlEntities(text)
  steps.push({
    title: "Décodage des entités HTML numériques",
    sourceMap: conversion.sourceMap,
  })
  text = conversion.text

  conversion = replacePatterns(text)
  steps.push({
    title: "Remplacement des caractères non-ASCII",
    sourceMap: conversion.sourceMap,
  })
  text = conversion.text

  conversion = convertHtmlElementsToText(text)
  steps.push({
    title: "Conversion des éléments HTML en texte",
    sourceMap: conversion.sourceMap,
  })

  return { steps, text: conversion.text }
}
