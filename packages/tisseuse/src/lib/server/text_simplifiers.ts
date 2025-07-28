import fs from "fs-extra"

import {
  convertHtmlElementsToText,
  decodeNamedHtmlEntities,
  decodeNumericHtmlEntities,
  replacePatterns,
  simplifyText,
  simplifyUnicodeCharacters,
  type Conversion,
  type ConversionTask,
  type ConversionTaskLeaf,
  type Converter,
} from "$lib/text_simplifiers.js"

export function chainAndWriteSimplifiers(
  filePathCore: string,
  title: string,
  simplifiers: Array<(text: string) => Conversion>,
): Converter {
  return (text: string): Conversion => {
    let index = 0
    const tasks: ConversionTask[] = []
    for (const simplifier of simplifiers) {
      const conversion = simplifier(text)
      if (
        (conversion.task as ConversionTaskLeaf).sourceMap === undefined ||
        (conversion.task as ConversionTaskLeaf).sourceMap.length !== 0
      ) {
        tasks.push(conversion.task)
        text = conversion.text
        fs.writeJsonSync(
          `${filePathCore}-${index}.conversion_task.json`,
          conversion.task,
        )
        fs.writeFileSync(`${filePathCore}-${index}.html`, text, {
          encoding: "utf-8",
        })
        index++
      }
    }
    return {
      task: { tasks, title },
      text,
    }
  }
}

export function simplifyHtmlAndWriteConversions(
  filePathCore: string,
  { removeAWithHref }: { removeAWithHref?: boolean } = {},
): Converter {
  return (text: string): Conversion =>
    chainAndWriteSimplifiers(filePathCore, "Simplification du HTML", [
      decodeNamedHtmlEntities,
      decodeNumericHtmlEntities,
      replacePatterns,
      simplifyUnicodeCharacters,
      convertHtmlElementsToText({ removeAWithHref }),
      simplifyText,
    ])(text)
}
