import fs from "fs-extra"

import {
  addLinksOrReferencesToHtmlPage,
  type OutputType,
} from "$lib/linkers/html.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import type { Transformation } from "$lib/text_parsers/transformers.js"
import type { LinkType } from "$lib/links.js"
import type { Sql } from "postgres"

export async function addLinksOrReferencesToHtmlFile({
  date,
  defaultTextId,
  europeDb,
  htmlFilePath,
  htmlTransformationsInputDir,
  htmlTransformationsOutputDir,
  htmlWithLinksFilePath,
  htmlWithLinksOrReferencesFilePath,
  htmlWithLinksTransformationsOutputDir,
  htmlWithReferencesFilePath,
  legiDb,
  linkBaseUrl,
  linkType,
  logIgnoredReferencesTypes,
  logPartialReferences,
  logReferences,
  referredLegifranceTextsInfosFilePath,
}: {
  date: string
  defaultTextId?: string
  europeDb: Sql
  htmlFilePath: string
  htmlTransformationsInputDir?: string
  htmlTransformationsOutputDir?: string
  htmlWithLinksFilePath?: string
  htmlWithLinksOrReferencesFilePath?: string
  htmlWithLinksTransformationsOutputDir?: string
  htmlWithReferencesFilePath?: string
  legiDb: Sql
  linkBaseUrl: string
  linkType: LinkType
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  logReferences?: boolean
  referredLegifranceTextsInfosFilePath?: string
}): Promise<void> {
  // Create or reuse a transformation, that simplifies HTML to text,
  // to be able to add links to articles, divisions & texts.
  // Configure the transformation to remove links from generated text,
  // because we don't want links to be added to existing links.
  const inputHtml = await fs.readFile(htmlFilePath, { encoding: "utf-8" })
  let htmlTransformation: Transformation
  if (htmlTransformationsInputDir === undefined) {
    htmlTransformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
    if (htmlTransformationsOutputDir !== undefined) {
      writeTransformation(htmlTransformation, htmlTransformationsOutputDir)
    }
  } else {
    htmlTransformation = readTransformation(
      inputHtml,
      htmlTransformationsInputDir,
    )
  }

  // Determine which output types are requested.
  const outputTypes: OutputType[] = []
  if (htmlWithLinksFilePath !== undefined) {
    outputTypes.push("links")
  }
  if (htmlWithLinksOrReferencesFilePath !== undefined) {
    outputTypes.push("links_or_references")
  }
  if (htmlWithReferencesFilePath !== undefined) {
    outputTypes.push("references")
  }

  // Add links to HTML page (string-only processing).
  const { outputByType, referredLegifranceTextCountByCid } =
    await addLinksOrReferencesToHtmlPage({
      date,
      defaultTextId,
      europeDb,
      htmlTransformation,
      inputHtml,
      legiDb,
      linkBaseUrl,
      linkType,
      logIgnoredReferencesTypes,
      logPartialReferences,
      logReferences,
      outputTypes,
      referredLegifranceTextsInfos:
        referredLegifranceTextsInfosFilePath !== undefined,
    })

  // Write files.

  const filePathByType: Partial<Record<OutputType, string>> = {}
  if (htmlWithLinksFilePath !== undefined) {
    filePathByType.links = htmlWithLinksFilePath
  }
  if (htmlWithLinksOrReferencesFilePath !== undefined) {
    filePathByType.links_or_references = htmlWithLinksOrReferencesFilePath
  }
  if (htmlWithReferencesFilePath !== undefined) {
    filePathByType.references = htmlWithReferencesFilePath
  }
  for (const [outputType, output] of Object.entries(outputByType)) {
    const filePath = filePathByType[outputType as OutputType]
    if (filePath !== undefined) {
      await fs.writeFile(filePath, output.html, { encoding: "utf-8" })
    }
  }
  if (
    outputByType.links !== undefined &&
    htmlWithLinksTransformationsOutputDir !== undefined
  ) {
    // Create a transformation that simplifies HTML with links to text,
    // to be able to extract table of contents, etc.
    // Configure the transformation to keep content of links from generated text,
    const htmlWithLinksTransformation = simplifyHtml()(outputByType.links.html)
    writeTransformation(
      htmlWithLinksTransformation,
      htmlWithLinksTransformationsOutputDir,
    )
  }
  if (referredLegifranceTextsInfosFilePath !== undefined) {
    await fs.writeJson(
      referredLegifranceTextsInfosFilePath,
      referredLegifranceTextCountByCid,
      { encoding: "utf-8", spaces: 2 },
    )
  }
}
