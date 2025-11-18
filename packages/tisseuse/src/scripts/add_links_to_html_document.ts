import fs from "fs-extra"
import sade from "sade"

import {
  assertNever,
  getOrLoadArticle,
  getOrLoadSectionTa,
  newLegifranceObjectCache,
  parseTextLinks,
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  simplifyHtml,
  TextParserContext,
  urlFromLegalId,
  type Transformation,
} from "$lib"
import { readTransformation, writeTransformation } from "$lib/server"
import config from "$lib/server/config.js"
import { legiDb } from "$lib/server/databases/index.js"

const { linkBaseUrl, linkType } = config

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  {
    date,
    "default-text-id": defaultTextId,
    "generate-links": outputDocumentPath,
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
    "generate-transformations"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
    referred?: string
    "use-transformations"?: string
  },
): Promise<number> {
  const inputHtml = await fs.readFile(inputDocumentPath, { encoding: "utf-8" })
  let transformation: Transformation
  if (transformationsInputDir === undefined) {
    transformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
    if (transformationsOutputDir !== undefined) {
      writeTransformation(transformation, transformationsOutputDir)
    }
  } else {
    transformation = readTransformation(inputHtml, transformationsInputDir)
  }
  if (outputDocumentPath !== undefined) {
    const inputText = transformation.output
    const context = new TextParserContext(inputText)
    const legifranceObjectCache = newLegifranceObjectCache()
    let output = inputHtml
    let outputOffset = 0
    const referredLegifranceTextCountByCid: Record<string, number> = {}

    for await (const link of parseTextLinks({
      context,
      date,
      legiDb,
      logIgnoredReferencesTypes,
      logPartialReferences,
      logReferences,
      state: { defaultTextId },
      transformation,
    })) {
      switch (link.type) {
        case "article_definition": {
          const {
            article,
            originalTransformation: articleOriginalTransformation,
            textId,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in article definition: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<span class="definition_article" id="definition_article_${textId}_${article.num!}">${original}</span>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        case "external_article": {
          const {
            articleId,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleId !== undefined) {
            if (articleOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external article link: ${JSON.stringify(link, null, 2)}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              articleOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              articleOriginalTransformation,
              `<a class="lien_article_externe" href="${urlFromLegalId(linkType, linkBaseUrl, articleId)}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                articleOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                articleOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (articleOriginalTransformation.position.stop -
                articleOriginalTransformation.position.start)
            if (referredLegifranceTextsInfosFilePath !== undefined) {
              const article = await getOrLoadArticle(
                legiDb,
                legifranceObjectCache,
                articleId,
              )
              const textCid = article?.CONTEXTE.TEXTE["@cid"]
              if (textCid !== undefined) {
                referredLegifranceTextCountByCid[textCid] =
                  (referredLegifranceTextCountByCid[textCid] ?? 0) + 1
              }
            }
          }
          break
        }

        case "external_division": {
          const {
            originalTransformation: divisionOriginalTransformation,
            sectionTaId,
          } = link
          if (sectionTaId !== undefined) {
            if (divisionOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external division link: ${JSON.stringify(link, null, 2)}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              divisionOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              divisionOriginalTransformation,
              `<a class="lien_division_externe" href="${urlFromLegalId(linkType, linkBaseUrl, sectionTaId)}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                divisionOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                divisionOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (divisionOriginalTransformation.position.stop -
                divisionOriginalTransformation.position.start)
            if (referredLegifranceTextsInfosFilePath !== undefined) {
              const sectionTa = await getOrLoadSectionTa(
                legiDb,
                legifranceObjectCache,
                sectionTaId,
              )
              const textCid = sectionTa?.CONTEXTE.TEXTE["@cid"]
              if (textCid !== undefined) {
                referredLegifranceTextCountByCid[textCid] =
                  (referredLegifranceTextCountByCid[textCid] ?? 0) + 1
              }
            }
          }
          break
        }

        case "external_text": {
          const { originalTransformation: texteOriginalTransformation, text } =
            link
          if (text.cid === undefined) {
            if (text.relative !== 0) {
              // It is not "la présente loi".
              // Note: Don't throw an exception because it occurs for all kinds of non handled texts (conventions,
              // décrets, etc).
              console.error(
                `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
              )
            }
            continue
          }

          if (texteOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in external text link: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            texteOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            texteOriginalTransformation,
            `<a class="lien_texte_externe" href="${urlFromLegalId(linkType, linkBaseUrl, text.cid!)}">${original}</a>`,
          )
          output =
            output.slice(
              0,
              texteOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              texteOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (texteOriginalTransformation.position.stop -
              texteOriginalTransformation.position.start)
          if (referredLegifranceTextsInfosFilePath !== undefined) {
            referredLegifranceTextCountByCid[text.cid] =
              (referredLegifranceTextCountByCid[text.cid] ?? 0) + 1
          }
          break
        }

        case "internal_article": {
          const {
            definition,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in internal article link: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        default: {
          assertNever("Link", link)
        }
      }
    }

    await fs.writeFile(outputDocumentPath, output, { encoding: "utf-8" })
    if (referredLegifranceTextsInfosFilePath !== undefined) {
      await fs.writeJson(
        referredLegifranceTextsInfosFilePath,
        referredLegifranceTextCountByCid,
        { encoding: "utf-8", spaces: 2 },
      )
    }
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
    "Generate HTML document with links in given file path",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
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
