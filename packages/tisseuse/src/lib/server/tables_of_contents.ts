import fs from "fs-extra"

import {
  addPositionsToTableOfContentsItems,
  getExtractedTableOfContentsFromTextBill,
  type TableOfContents,
} from "$lib/extractors/table_of_contents.js"
import { readTransformation } from "$lib/server/text_parsers/transformers.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"

export async function addPositionsToTableOfContentsFile(
  htmlPath: string,
  transformationDir: string,
  tableOfContentsPath: string,
  segmentationPath: string,
): Promise<void> {
  const html = await fs.readFile(htmlPath, { encoding: "utf-8" })
  const transformation = readTransformation(html, transformationDir)
  const text = transformation.output
  const context = new TextParserContext(text)
  const tableOfContents = (await fs.readJson(tableOfContentsPath, {
    encoding: "utf-8",
  })) as TableOfContents

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of addPositionsToTableOfContentsItems({
    context,
    tableOfContents,
    transformation,
  })) {
    // Do nothing.
  }

  await fs.writeJson(segmentationPath, tableOfContents, {
    encoding: "utf-8",
    spaces: 2,
  })
}

export async function simplifiedHtmlBillFileToTableOfContentsFile(
  htmlBillPath: string,
  transformationDir: string,
  tableOfContentsPath: string,
): Promise<void> {
  const htmlBill = await fs.readFile(htmlBillPath, { encoding: "utf-8" })
  const transformation = readTransformation(htmlBill, transformationDir)
  const textBill = transformation.output
  const tableOfContents = getExtractedTableOfContentsFromTextBill(textBill)
  await fs.writeJson(tableOfContentsPath, tableOfContents, {
    encoding: "utf-8",
    spaces: 2,
  })
}
