import fs from "fs-extra"
import sade from "sade"

import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import { writeTransformation } from "$lib/server/text_parsers/transformers.js"

async function htmlDocumentToText(
  inputDocumentPath: string,
  outputDir: string,
): Promise<number> {
  const inputHtml = await fs.readFile(inputDocumentPath, { encoding: "utf-8" })
  const transformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
  writeTransformation(transformation, outputDir)
  return 0
}

sade("html_document_to_text <html_document> <output_dir>", true)
  .describe("Convert an HTML document to an extremely simplified text")
  .action(async (inputDocumentPath, outputDir) => {
    process.exit(await htmlDocumentToText(inputDocumentPath, outputDir))
  })
  .parse(process.argv)
