import { assertNever } from "$lib/asserts.js"

import {
  chainTransformers,
  tagRegExp,
  type SourceMapSegment,
  type TransformationLeaf,
  type TransformationNode,
  type TransformerLeaf,
  type TransformerNode,
} from "./transformers.js"

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

export function convertHtmlElementsToText({
  removeAWithHref,
}: {
  removeAWithHref?: boolean
} = {}): TransformerLeaf {
  return (input: string): TransformationLeaf => {
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
    while (inputIndex < input.length) {
      // Find the next tag
      const tagStartIndex = input.indexOf("<", inputIndex)

      if (tagStartIndex === -1) {
        // No more tags, keep the remaining text unchanged.
        outputFragments.push(input.slice(inputIndex).replace(/[\n\r]/g, " "))
        return {
          input,
          output: outputFragments.join(""),
          sourceMap,
          title,
        }
      }

      // Find the end of the tag.
      const tagEndIndex = input.indexOf(">", tagStartIndex)
      if (tagEndIndex === -1) {
        // Malformed HTML, just keep the remaining text unchanged.
        outputFragments.push(input.slice(inputIndex).replace(/[\n\r]/g, " "))
        return {
          input,
          output: outputFragments.join(""),
          sourceMap,
          title,
        }
      }

      const tag = input.slice(tagStartIndex, tagEndIndex + 1)
      const isClosingTag = tag.startsWith("</")
      const tagLength = tag.length
      const tagMatch = tag.match(tagRegExp)

      if (tagMatch === null) {
        // Not a standard tag. Keep it as normal text.
        outputFragments.push(
          input.slice(inputIndex, tagEndIndex + 1).replace(/[\n\r]/g, " "),
        )
        inputIndex = tagEndIndex + 1
        continue
      }

      const tagName = tagMatch[1]
      const tagNameUpperCase = tagName.toUpperCase()
      const isSelfClosingTag =
        tag.endsWith("/>") ||
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
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
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
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
            )
          }
          // Replace self-closing tag with new line.
          const tagLength = tagEndIndex + 1 - tagStartIndex
          outputFragments.push("\n")
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            openingTag: tag,
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
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
            )
          }
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            openingTag: tag,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 0,
          })
          outputOffset -= tagLength
        } else {
          // Keep self-closing tag (and the text before tag).
          outputFragments.push(
            input.slice(inputIndex, tagEndIndex + 1).replace(/[\n\r]/g, " "),
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
                  input
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
                  input
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
                input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
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
          (removeAWithHref && tagNameUpperCase === "A" && / href=/i.test(tag))
        ) {
          // Ignore opening tag, its content and closing tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
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
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
            )
          }
          // Skip opening tag.
          const openingSegmentIndex = sourceMap.length
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            openingTag: tag,
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
              input.slice(inputIndex, tagStartIndex).replace(/[\n\r]/g, " "),
            )
          }
          // Replace opening tag with new line.
          outputFragments.push("\n")
          const openingSegmentIndex = sourceMap.length
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            openingTag: tag,
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
            input.slice(inputIndex, tagEndIndex + 1).replace(/[\n\r]/g, " "),
          )
          tagsStack.push({
            name: tagNameUpperCase,
          })
        }
      }
      inputIndex = tagEndIndex + 1
    }

    return {
      input,
      output: outputFragments.join(""),
      sourceMap,
      title,
    }
  }
}

export function decodeNamedHtmlEntities(input: string): TransformationLeaf {
  let outputOffset = 0
  const sourceMap: SourceMapSegment[] = []
  // Decode decimal (e.g., &#65;) or hexadecimal references (e.g., &#x4a;).
  const output = input.replace(
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
    input,
    output,
    sourceMap,
    title: "Décodage des entités HTML nommées",
  }
}

export function decodeNumericHtmlEntities(input: string): TransformationLeaf {
  let outputOffset = 0
  const sourceMap: SourceMapSegment[] = []
  // Decode decimal (e.g., &#65;) or hexadecimal references (e.g., &#x4a;).
  const output = input.replace(
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
    input,
    output,
    sourceMap,
    title: "Décodage des entités HTML numériques",
  }
}

export function replacePattern(
  pattern: RegExp | string,
  replacement: string,
): TransformerLeaf {
  return (input: string): TransformationLeaf => {
    const sourceMap: SourceMapSegment[] = []
    const output = input.replaceAll(pattern, (slice, ...rest) => {
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
      input,
      output,
      sourceMap,
      title: `Remplacement de ${pattern} par ${JSON.stringify(replacement)}`,
    }
  }
}

export function replacePatterns(input: string): TransformationNode {
  const transformations: TransformationLeaf[] = []
  let text = input
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
    const transformation = replacePattern(pattern, replacement)(text)
    if (transformation.sourceMap.length !== 0) {
      transformations.push(transformation)
      text = transformation.output
    }
  }
  return {
    input,
    output: text,
    title:
      "Suppression des commentaires, scripts et styles HTML et nettoyage d'expressions",
    transformations,
  }
}

export function simplifyHtml({
  removeAWithHref,
}: { removeAWithHref?: boolean } = {}): TransformerNode {
  return (input: string): TransformationNode =>
    chainTransformers("Simplification du HTML", [
      decodeNamedHtmlEntities,
      decodeNumericHtmlEntities,
      replacePatterns,
      simplifyUnicodeCharacters,
      convertHtmlElementsToText({ removeAWithHref }),
      simplifyText,
    ])(input)
}

export function simplifyText(input: string): TransformationNode {
  const transformations: TransformationLeaf[] = []
  let text = input
  for (const [title, pattern, replacement] of [
    ["Remplacement des espaces multiples par une espace unique", /  +/g, " "],
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
    const output = text.replaceAll(pattern, (slice, ...rest) => {
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
      transformations.push({
        input: text,
        output,
        sourceMap,
        title,
      })
      text = output
    }
  }

  return {
    input,
    output: text,
    title: "Simplification du texte",
    transformations,
  }
}

export function simplifyUnicodeCharacters(input: string): TransformationLeaf {
  const sourceMap: SourceMapSegment[] = []
  let text = input
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
    input,
    output: text,
    sourceMap,
    title: "Simplification des caractères unicodes",
  }
}
