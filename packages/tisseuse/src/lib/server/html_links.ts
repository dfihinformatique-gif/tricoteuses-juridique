import { escapeHtml } from "@tricoteuses/legifrance"
import fs from "fs-extra"

import { assertNever } from "$lib/asserts.js"
import { newLegifranceObjectCache } from "$lib/cache.js"
import { urlFromLegalId } from "$lib/links.js"
import {
  getOrLoadArticle,
  getOrLoadSectionTa,
} from "$lib/loaders/legifrance.js"
import config from "$lib/server/config.js"
import { legiDb } from "$lib/server/databases/index.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"
import { type FragmentReverseTransformation } from "$lib/text_parsers/fragments.js"
import { extractTextLinks } from "$lib/extractors/links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

type OutputByType = Partial<
  Record<
    OutputType,
    {
      filePath: string
      html: string
      offset: number
    }
  >
>
type OutputType = (typeof outputTypes)[number]

const { linkBaseUrl, linkType } = config
const outputTypes = ["links", "links_or_references", "references"] as const

function addExternalLinkToOutputs({
  attributes,
  originalTransformation,
  outputByType,
}: {
  attributes: { class?: string; href?: string; target?: string }
  originalTransformation: FragmentReverseTransformation
  outputByType: OutputByType
}): void {
  const attributesString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value, true)}"`)
    .join(" ")
  for (const outputType of ["links", "links_or_references"] as OutputType[]) {
    const output = outputByType[outputType]
    if (output !== undefined) {
      const original = reverseTransformedInnerFragment(
        output.html,
        originalTransformation,
        output.offset,
      )
      const replacement = reverseTransformedReplacement(
        originalTransformation,
        `<a ${attributesString}>${original}</a>`,
      )
      output.html =
        output.html.slice(
          0,
          originalTransformation.position.start + output.offset,
        ) +
        replacement +
        output.html.slice(originalTransformation.position.stop + output.offset)
      output.offset +=
        replacement.length -
        (originalTransformation.position.stop -
          originalTransformation.position.start)
    }
  }
}

export async function addLinksOrReferencesToHtmlFile({
  date,
  defaultTextId,
  htmlFilePath,
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
}: {
  date: string
  defaultTextId?: string
  htmlFilePath: string
  htmlTransformationsInputDir?: string
  htmlTransformationsOutputDir?: string
  htmlWithLinksFilePath?: string
  htmlWithLinksOrReferencesFilePath?: string
  htmlWithLinksTransformationsOutputDir?: string
  htmlWithReferencesFilePath?: string
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

  // Add links to HTML.

  const context = new TextParserContext(htmlTransformation.output)
  const legifranceObjectCache = newLegifranceObjectCache()
  const referredLegifranceTextCountByCid: Record<string, number> = {}

  const outputByType: OutputByType = {}
  if (htmlWithLinksFilePath !== undefined) {
    outputByType.links = {
      filePath: htmlWithLinksFilePath,
      html: inputHtml,
      offset: 0,
    }
  }
  if (htmlWithLinksOrReferencesFilePath !== undefined) {
    outputByType.links_or_references = {
      filePath: htmlWithLinksOrReferencesFilePath,
      html: inputHtml,
      offset: 0,
    }
  }
  if (htmlWithReferencesFilePath !== undefined) {
    outputByType.references = {
      filePath: htmlWithReferencesFilePath,
      html: inputHtml,
      offset: 0,
    }
  }

  for await (const link of extractTextLinks({
    context,
    date,
    legiDb,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
    state: { defaultTextId },
    transformation: htmlTransformation,
  })) {
    switch (link.type) {
      case "article_definition": {
        const { article, originalTransformation, textId } = link
        if (originalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in article definition: ${JSON.stringify(link, null, 2)}`,
          )
        }
        for (const output of Object.values(outputByType)) {
          const original = reverseTransformedInnerFragment(
            output.html,
            originalTransformation,
            output.offset,
          )
          const replacement = reverseTransformedReplacement(
            originalTransformation,
            `<span class="definition_article" id="definition_article_${textId}_${article.num!.replaceAll(" ", "_")}">${original}</span>`,
          )
          output.html =
            output.html.slice(
              0,
              originalTransformation.position.start + output.offset,
            ) +
            replacement +
            output.html.slice(
              originalTransformation.position.stop + output.offset,
            )
          output.offset +=
            replacement.length -
            (originalTransformation.position.stop -
              originalTransformation.position.start)
        }
        break
      }

      case "external_article": {
        const { article, articleId, originalTransformation } = link
        if (originalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in external article link: ${JSON.stringify(link, null, 2)}`,
          )
        }
        if (articleId !== undefined) {
          addExternalLinkToOutputs({
            attributes: {
              class: "lien_article_externe",
              href: urlFromLegalId(linkType, linkBaseUrl, articleId),
            },
            originalTransformation,
            outputByType,
          })
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
        addReferenceToOutputs({
          attributes: {
            class: "reference_article",
            style: "background-color: #eae462",
            title: JSON.stringify(article),
          },
          id: articleId,
          originalTransformation,
          outputByType,
        })
        break
      }

      case "external_division": {
        const { division, originalTransformation, sectionTaId } = link
        if (originalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in external division link: ${JSON.stringify(link, null, 2)}`,
          )
        }
        if (sectionTaId !== undefined) {
          addExternalLinkToOutputs({
            attributes: {
              class: "lien_division_externe",
              href: urlFromLegalId(linkType, linkBaseUrl, sectionTaId),
            },
            originalTransformation,
            outputByType,
          })
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
        addReferenceToOutputs({
          attributes: {
            class: "reference_division",
            style: "background-color: #eae462",
            title: JSON.stringify(division),
          },
          id: sectionTaId,
          originalTransformation,
          outputByType,
        })
        break
      }

      case "european_text": {
        const { link: href, originalTransformation, text } = link
        if (originalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in external text link: ${JSON.stringify(link, null, 2)}`,
          )
        }
        addExternalLinkToOutputs({
          attributes: {
            class: "lien_texte_european",
            href,
            target: "_blank",
          },
          originalTransformation,
          outputByType,
        })
        // if (referredLegifranceTextsInfosFilePath !== undefined) {
        //   referredLegifranceTextCountByCid[text.cid] =
        //     (referredLegifranceTextCountByCid[text.cid] ?? 0) + 1
        // }
        addReferenceToOutputs({
          attributes: {
            class: "reference_texte",
            style: "background-color: #eae462",
            title: JSON.stringify(text),
          },
          id: text.id,
          originalTransformation,
          outputByType,
        })
        break
      }

      case "external_text": {
        const { originalTransformation, text } = link
        if (originalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in external text link: ${JSON.stringify(link, null, 2)}`,
          )
        }
        if (text.cid === undefined) {
          if (!text.present) {
            // It is not "la présente loi" or "le présent code".
            // Note: Don't throw an exception because it occurs for all kinds of non handled texts (conventions,
            // décrets, etc).
            console.error(
              `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
            )
          }
        } else {
          addExternalLinkToOutputs({
            attributes: {
              class: "lien_texte_externe",
              href: urlFromLegalId(linkType, linkBaseUrl, text.cid),
            },
            originalTransformation,
            outputByType,
          })
          if (referredLegifranceTextsInfosFilePath !== undefined) {
            referredLegifranceTextCountByCid[text.cid] =
              (referredLegifranceTextCountByCid[text.cid] ?? 0) + 1
          }
        }
        addReferenceToOutputs({
          attributes: {
            class: "reference_texte",
            style: "background-color: #eae462",
            title: JSON.stringify(text),
          },
          id: text.cid,
          originalTransformation,
          outputByType,
        })
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
        for (const output of Object.values(outputByType)) {
          const original = reverseTransformedInnerFragment(
            output.html,
            articleOriginalTransformation,
            output.offset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!.replaceAll(" ", "_")}" style="background-color: #eae462">${original}</a>`,
          )
          output.html =
            output.html.slice(
              0,
              articleOriginalTransformation.position.start + output.offset,
            ) +
            replacement +
            output.html.slice(
              articleOriginalTransformation.position.stop + output.offset,
            )
          output.offset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
        }
        break
      }

      default: {
        assertNever("Link", link)
      }
    }
  }

  // Write files.

  for (const output of Object.values(outputByType)) {
    await fs.writeFile(output.filePath, output.html, { encoding: "utf-8" })
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

function addReferenceToOutputs({
  attributes,
  id,
  originalTransformation,
  outputByType,
}: {
  attributes: { class?: string; style?: string; title?: string }
  id?: string
  originalTransformation: FragmentReverseTransformation
  outputByType: OutputByType
}): void {
  const attributesString = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtml(value, true)}"`)
    .join(" ")
  for (const outputType of [
    "links_or_references",
    "references",
  ] as OutputType[]) {
    if (outputType === "links_or_references" && id !== undefined) {
      // Link is present ⇒ don't overwrite it.
      continue
    }
    const output = outputByType[outputType]
    if (output !== undefined) {
      const original = reverseTransformedInnerFragment(
        output.html,
        originalTransformation,
        output.offset,
      )
      const replacement = reverseTransformedReplacement(
        originalTransformation,
        `<span ${attributesString}>${original}</span>`,
      )
      output.html =
        output.html.slice(
          0,
          originalTransformation.position.start + output.offset,
        ) +
        replacement +
        output.html.slice(originalTransformation.position.stop + output.offset)
      output.offset +=
        replacement.length -
        (originalTransformation.position.stop -
          originalTransformation.position.start)
    }
  }
}
