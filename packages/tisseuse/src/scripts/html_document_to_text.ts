import fs from "fs-extra"
import sade from "sade"

import { simplifyHtml } from "$lib"
import { writeTransformation } from "$lib/server/text_parsers/transformers.js"

async function htmlDocumentToText(
  htmlPath: string,
  transformationDir: string,
  textPath: string,
): Promise<number> {
  const html = await fs.readFile(htmlPath, { encoding: "utf-8" })
  const transformation = simplifyHtml({ removeAWithHref: true })(html)
  writeTransformation(transformation, transformationDir)
  const text = transformation.output
  await fs.writeFile(textPath, text, { encoding: "utf-8" })
  return 0
}

sade(
  "html_document_to_text <html_document> <transformation_dir> <text_document>",
  true,
)
  .describe("Convert an HTML document to an extremely simplified text")
  .action(async (htmlPath, transformationDir, textPath) => {
    process.exit(
      await htmlDocumentToText(htmlPath, transformationDir, textPath),
    )
  })
  .parse(process.argv)
