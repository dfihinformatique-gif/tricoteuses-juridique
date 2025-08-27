import fs from "fs-extra"
import path from "node:path"
import sade from "sade"

import { simplifyHtml } from "$lib/text_simplifiers.js"
import { writeConversion } from "$lib/server/text_simplifiers.js"

async function htmlDocumentToText(
  inputDocumentPath: string,
  outputDir: string,
  {
    intermediate,
  }: {
    intermediate?: boolean
  } = {},
): Promise<number> {
  const inputHtml = await fs.readFile(inputDocumentPath, { encoding: "utf-8" })
  const inputFilename = path.basename(inputDocumentPath)
  const inputFilenameCore = inputFilename.slice(
    0,
    -path.extname(inputFilename).length,
  )
  const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
  writeConversion(path.join(outputDir, inputFilenameCore), conversion, {
    recursive: intermediate,
  })
  return 0
}

sade("html_document_to_text <html_document> <output_dir>", true)
  .describe("Convert an HTML document to an extremely simplified text")
  .option("-i, --intermediate", "Generate files for intermediate conversions")
  .action(async (inputDocumentPath, outputDir, options) => {
    process.exit(
      await htmlDocumentToText(inputDocumentPath, outputDir, options),
    )
  })
  .parse(process.argv)
