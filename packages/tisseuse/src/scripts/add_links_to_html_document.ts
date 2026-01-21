import sade from "sade"

import { addLinksOrReferencesToHtmlFile } from "$lib/server/html_links"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  {
    date,
    "default-text-id": defaultTextId,
    "generate-links": htmlWithLinksFilePath,
    "generate-links-or-references": htmlWithLinksOrReferencesFilePath,
    "generate-references": htmlWithReferencesFilePath,
    "generate-transformations": transformationsOutputDir,
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
    referred: referredLegifranceTextsInfosFilePath,
    "use-transformations": transformationsInputDir,
  }: {
    date: string
    "default-text-id"?: string
    "generate-links"?: string
    "generate-links-or-references"?: string
    "generate-references"?: string
    "generate-transformations"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
    referred?: string
    "use-transformations"?: string
  },
): Promise<number> {
  if (
    htmlWithLinksFilePath !== undefined ||
    htmlWithLinksOrReferencesFilePath !== undefined ||
    htmlWithReferencesFilePath !== undefined
  ) {
    await addLinksOrReferencesToHtmlFile(inputDocumentPath, {
      date,
      defaultTextId,
      htmlWithLinksFilePath,
      htmlWithLinksOrReferencesFilePath,
      htmlWithReferencesFilePath,
      logIgnoredReferencesTypes,
      logPartialReferences,
      logReferences,
      referredLegifranceTextsInfosFilePath,
      transformationsInputDir,
      transformationsOutputDir,
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
    "-t, --generate-transformations",
    "Store HTML to text transformations to given dir",
  )
  .option(
    "-u, --use-transformations",
    "Use text transformations at given dir instead of HTML document",
  )
  .action(async (inputDocumentPath, options) => {
    process.exit(await addLinksToHtmlDocument(inputDocumentPath, options))
  })
  .parse(process.argv)
