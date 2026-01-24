import sade from "sade"

import { addLinksOrReferencesToHtmlFile } from "$lib/server/html_links"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  {
    date,
    "default-text-id": defaultTextId,
    "generate-html-transformations": htmlTransformationsOutputDir,
    "generate-html-with-links-transformations":
      htmlWithLinksTransformationsOutputDir,
    "generate-links": htmlWithLinksFilePath,
    "generate-links-or-references": htmlWithLinksOrReferencesFilePath,
    "generate-references": htmlWithReferencesFilePath,
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
    referred: referredLegifranceTextsInfosFilePath,
    "use-html-transformations": htmlTransformationsInputDir,
  }: {
    date: string
    "default-text-id"?: string
    "generate-html-transformations"?: string
    "generate-html-with-links-transformations"?: string
    "generate-links"?: string
    "generate-links-or-references"?: string
    "generate-references"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
    referred?: string
    "use-html-transformations"?: string
  },
): Promise<number> {
  if (
    htmlWithLinksFilePath !== undefined ||
    htmlWithLinksOrReferencesFilePath !== undefined ||
    htmlWithReferencesFilePath !== undefined
  ) {
    await addLinksOrReferencesToHtmlFile({
      date,
      defaultTextId,
      htmlFilePath: inputDocumentPath,
      htmlTransformationsInputDir,
      htmlTransformationsOutputDir,
      htmlWithLinksFilePath,
      htmlWithLinksOrReferencesFilePath,
      htmlWithLinksTransformationsOutputDir,
      htmlWithReferencesFilePath,
      logIgnoredReferencesTypes,
      logPartialReferences,
      logReferences,
      referredLegifranceTextsInfosFilePath,
    })
  }

  return 0
}

sade("add_links_to_html_document <input_document>", true)
  .describe("Add links to an HTML document")
  .option("-d, --date", "Date of HTML document in YYYY-MM-DD format")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-id, --default-text-id",
    "Optional Légifrance ID of the code or text to use when an article reference is ambiguous",
  )
  .option(
    "-l, --generate-links",
    "Generate HTML document with links (only) in given file path",
  )
  .option(
    "-o, --generate-links-or-references",
    "Generate HTML document with links or references (when links are not found) in given file path",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .option(
    "-r, --generate-references",
    "Generate HTML document with references (only) in given file path",
  )
  .option("-r, --referred", "Save IDs of Legifrance texts to given file")
  .option(
    "-t, --generate-html-with-links-transformations",
    "Store HTML (with links) to text transformations to given dir",
  )
  .option(
    "-U, --use-html-transformations",
    "Use text transformations (generated from HTML without links) at given dir instead of HTML document",
  )
  .option(
    "-W, --generate-html-transformations",
    "Store HTML (without links) to text transformations to given dir",
  )
  .action(async (inputDocumentPath, options) => {
    process.exit(await addLinksToHtmlDocument(inputDocumentPath, options))
  })
  .parse(process.argv)
