import sade from "sade"

import { simplifiedHtmlBillFileToTableOfContentsFile } from "$lib/server"

sade(
  "simplified_html_bill_to_table_of_contents <html_bill> <transformation_dir> <table_of_contents>",
  true,
)
  .describe("Extract the table of contents from a HTML bill simplified to text")
  .action(async (htmlBillPath, transformationDir, tableOfContentsPath) => {
    await simplifiedHtmlBillFileToTableOfContentsFile(
      htmlBillPath,
      transformationDir,
      tableOfContentsPath,
    )
    process.exit(0)
  })
  .parse(process.argv)
