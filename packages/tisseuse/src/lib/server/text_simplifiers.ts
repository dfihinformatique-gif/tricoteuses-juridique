import fs from "fs-extra"

import {
  convertHtmlElementsToText,
  decodeNamedHtmlEntities,
  decodeNumericHtmlEntities,
  replacePatterns,
  simplifyText,
  type Conversion,
  type ConversionTask,
  type Converter,
} from "$lib/text_simplifiers.js"

export function chainAndWriteSimplifiers(
  filePathCore: string,
  title: string,
  simplifiers: Array<(text: string) => Conversion>,
): Converter {
  return (text: string): Conversion => {
    const tasks: ConversionTask[] = []
    for (const [index, simplifier] of simplifiers.entries()) {
      const conversion = simplifier(text)
      tasks.push(conversion.task)
      text = conversion.text
      fs.writeJsonSync(
        `${filePathCore}-${index}.conversion_task.json`,
        conversion.task,
      )
      fs.writeFileSync(`${filePathCore}-${index}.html`, text, {
        encoding: "utf-8",
      })
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
      convertHtmlElementsToText({ removeAWithHref }),
      simplifyText,
    ])(text)
}
