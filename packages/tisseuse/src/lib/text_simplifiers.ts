import { assertNever } from "./asserts.js"

interface Conversion {
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
  text: string,
): Conversion {
  const tasks: ConversionTask[] = []
  for (const simplifier of simplifiers) {
    const conversion = simplifier(text)
    tasks.push(conversion.task)
    text = conversion.text
  }
  return {
    task: { tasks, title },
    text,
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
        }
    > = []
    const title = "Conversion des éléments HTML en texte"
    while (inputIndex < inputText.length) {
      // Find the next tag
      const tagStartIndex = inputText.indexOf("<", inputIndex)

      if (tagStartIndex === -1) {
        // No more tags, keep the remaining text unchanged.
        outputFragments.push(
          inputText.substring(inputIndex).replace(/[\n\r]/g, " "),
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
          inputText.substring(inputIndex).replace(/[\n\r]/g, " "),
        )
        return {
          task: { sourceMap, title },
          text: outputFragments.join(""),
        }
      }

      const tagContent = inputText.substring(tagStartIndex, tagEndIndex + 1)
      const isClosingTag = tagContent.startsWith("</")
      const tagLength = tagContent.length
      const tagMatch = tagContent.match(/^<\/?([A-Z][A-Z0-9]*)/i)

      if (tagMatch === null) {
        // Not a standard tag. Keep it as normal text.
        outputFragments.push(
          inputText
            .substring(inputIndex, tagEndIndex + 1)
            .replace(/[\n\r]/g, " "),
        )
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
            outputFragments.push(
              inputText
                .substring(inputIndex, tagStartIndex)
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
                .substring(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Replace opening tag with new line.
          const tagLength = tagEndIndex + 1 - tagStartIndex
          outputFragments.push("\n")
          sourceMap.push({
            inputIndex: tagStartIndex,
            inputLength: tagLength,
            outputIndex: tagStartIndex + outputOffset,
            outputLength: 1,
          })
          outputOffset += 1 - tagLength
        } else if (["IMG"].includes(tagNameUpperCase)) {
          // Remove self-closing tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .substring(inputIndex, tagStartIndex)
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
              .substring(inputIndex, tagStartIndex)
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
                    .substring(inputIndex, tagEndIndex + 1)
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
                    .substring(inputIndex, tagStartIndex)
                    .replace(/[\n\r]/g, " "),
                )
                if (tagInfos.closingTagReplacement.length !== 0) {
                  outputFragments.push(tagInfos.closingTagReplacement)
                }
                const tagLength = tagEndIndex + 1 - tagStartIndex
                sourceMap.push({
                  inputIndex: tagStartIndex,
                  inputLength: tagLength,
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
                  .substring(inputIndex, tagStartIndex)
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
          ["HEAD", "SCRIPT", "STYLE"].includes(tagNameUpperCase) ||
          (removeAWithHref &&
            tagNameUpperCase === "A" &&
            / href=/i.test(tagContent))
        ) {
          // Ignore opening tag, its content and closing tag.

          if (tagStartIndex > inputIndex) {
            // Keep the text before tag as is.
            outputFragments.push(
              inputText
                .substring(inputIndex, tagStartIndex)
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
                .substring(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Skip opening tag.
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
          })
        } else if (
          [
            "H1",
            "H2",
            "H3",
            "H4",
            "H5",
            "H6",
            "DIV",
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
                .substring(inputIndex, tagStartIndex)
                .replace(/[\n\r]/g, " "),
            )
          }
          // Replace opening tag with new line.
          outputFragments.push("\n")
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
          })
        } else {
          // Preserve opening tag.

          outputFragments.push(
            inputText
              .substring(inputIndex, tagEndIndex + 1)
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
    (substring, name, inputIndex: number) => {
      const replacement = characterByNamedHtmlEntity[
        (name as string).toLowerCase()
      ] as string
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
    task: {
      sourceMap,
      title: "Décodage des entités HTML numériques",
    },
    text,
  }
}

export function replacePatterns(text: string): Conversion {
  const sourceMap: SourceMapSegment[] = []
  for (const [pattern, replacement] of [
    // Note: The most englobing patterns must be first.

    // Remove HTML comment
    [/<!--.*?-->/g, ""],
    // Replace U+00A0 (no-break space) and tab with a normal space.
    [/[ \t]/g, " "],
    // Ensure that there is always a space after "n°".
    [/(\sn°)([^\s])/gi, "$1 $2"],
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
    text = text.replaceAll(pattern, (substring, ...rest) => {
      const inputIndex: number = rest.at(-2)
      let expandedReplacement = replacement
      for (const [index, p] of rest.slice(0, -2).entries()) {
        expandedReplacement = expandedReplacement.replaceAll(`$${index + 1}`, p)
      }
      const sourceMapSegment: SourceMapSegment = {
        inputIndex,
        inputLength: substring.length,
        // Note: `outputIndex` is added below.
        outputLength: expandedReplacement.length,
      } as SourceMapSegment
      const nextSourceMapSegmentIndex = sourceMap.findIndex(
        (segment) => segment.inputIndex > inputIndex,
      )
      if (nextSourceMapSegmentIndex === -1) {
        sourceMap.push(sourceMapSegment)
      } else {
        sourceMap.splice(nextSourceMapSegmentIndex, 0, sourceMapSegment)
      }
      return expandedReplacement
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
      title:
        "Suppression des commentaires HTML et remplacement des caractères unicodes",
    },
    text,
  }
}

export function simplifyHtml({
  removeAWithHref,
}: { removeAWithHref?: boolean } = {}): Converter {
  return (text: string): Conversion =>
    chainSimplifiers(
      "Simplification du HTML",
      [
        decodeNamedHtmlEntities,
        decodeNumericHtmlEntities,
        replacePatterns,
        convertHtmlElementsToText({ removeAWithHref }),
        simplifyText,
      ],
      text,
    )
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
    text = text.replaceAll(pattern, (substring, ...rest) => {
      const inputIndex: number = rest.at(-2)
      let expandedReplacement = replacement
      for (const [index, p] of rest.slice(0, -2).entries()) {
        expandedReplacement = expandedReplacement.replaceAll(`$${index + 1}`, p)
      }
      sourceMap.push({
        inputIndex,
        inputLength: substring.length,
        outputIndex: inputIndex + outputOffset,
        outputLength: expandedReplacement.length,
      })
      outputOffset += expandedReplacement.length - substring.length
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
