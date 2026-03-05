import { escapeHtml } from "@tricoteuses/legifrance"
import type { Sql } from "postgres"

import { assertNever } from "$lib/asserts.js"
import { newLegifranceObjectCache } from "$lib/cache.js"
import {
  extractTextLinks,
  type DefinitionOrLink,
  type TextLinksParserState,
} from "$lib/extractors/links.js"
import { urlFromLegalId, type LinkType } from "$lib/links.js"
import {
  getOrLoadArticle,
  getOrLoadSectionTa,
} from "$lib/loaders/legifrance.js"

import type { TextAstReference } from "$lib/text_parsers/ast.js"
import { type FragmentReverseTransformation } from "$lib/text_parsers/fragments.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

function referenceTitleJson(
  entity: object,
  reference: TextAstReference,
): string {
  if (reference.type === "reference_et_action") {
    return JSON.stringify({ ...entity, action: reference.action })
  }
  return JSON.stringify(entity)
}

export async function addLinksToHtml({
  date,
  europeDb,
  html,
  legiDb,
  linkBaseUrl,
  linkType,
  logIgnoredReferencesTypes,
  logPartialReferences,
  logReferences,
  onLink,
  previousContext,
  state,
}: {
  date: string
  europeDb: Sql
  html: string
  legiDb: Sql
  linkBaseUrl: string
  linkType: LinkType
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  logReferences?: boolean
  onLink?: (link: DefinitionOrLink, index: number) => Promise<boolean | void>
  previousContext?: TextParserContext
  state?: TextLinksParserState
}): Promise<{ context: TextParserContext; output: string | null }> {
  const transformation = simplifyHtml({ removeAWithHref: true })(html)
  const context = new TextParserContext(transformation.output)
  context.currentArticle = previousContext?.currentArticle
  context.currentText = previousContext?.currentText
  let output = html
  let outputOffset = 0

  let index = -1
  for await (const link of extractTextLinks({
    context,
    date,
    europeDb,
    legiDb,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
    state,
    transformation,
  })) {
    index++
    if (onLink !== undefined) {
      const skip = await onLink(link, index)
      if (skip) {
        continue
      }
    }
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
          `<span class="definition_article" id="definition_article_${textId}_${article.num!.replaceAll(" ", "_")}">${original}</span>`,
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
          output.slice(texteOriginalTransformation.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (texteOriginalTransformation.position.stop -
            texteOriginalTransformation.position.start)
        break
      }

      case "european_text": {
        const {
          url: href,
          originalTransformation: texteOriginalTransformation,
        } = link
        if (href === undefined) {
          continue
        }

        if (texteOriginalTransformation === undefined) {
          throw new Error(
            `Missing originalTransformation attribute in european text link: ${JSON.stringify(link, null, 2)}`,
          )
        }
        const original = reverseTransformedInnerFragment(
          output,
          texteOriginalTransformation,
          outputOffset,
        )
        const replacement = reverseTransformedReplacement(
          texteOriginalTransformation,
          `<a class="lien_texte_european" href="${href}" target="_blank">${original}</a>`,
        )
        output =
          output.slice(
            0,
            texteOriginalTransformation.position.start + outputOffset,
          ) +
          replacement +
          output.slice(texteOriginalTransformation.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (texteOriginalTransformation.position.stop -
            texteOriginalTransformation.position.start)
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
          `<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!.replaceAll(" ", "_")}" style="background-color: #eae462">${original}</a>`,
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

  return { context, output: output === html ? null : output }
}

export type OutputByType = Partial<
  Record<
    OutputType,
    {
      html: string
      offset: number
    }
  >
>
export type OutputType = (typeof outputTypes)[number]

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

export async function addLinksOrReferencesToHtmlPage({
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
  outputTypes: requestedOutputTypes,
  referredLegifranceTextsInfos,
}: {
  date: string
  defaultTextId?: string
  europeDb: Sql
  htmlTransformation: Transformation
  inputHtml: string
  legiDb: Sql
  linkBaseUrl: string
  linkType: LinkType
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  logReferences?: boolean
  outputTypes: OutputType[]
  referredLegifranceTextsInfos?: boolean
}): Promise<{
  outputByType: OutputByType
  referredLegifranceTextCountByCid: Record<string, number>
}> {
  // Add links to HTML.

  const context = new TextParserContext(htmlTransformation.output)
  const legifranceObjectCache = newLegifranceObjectCache()
  const referredLegifranceTextCountByCid: Record<string, number> = {}

  const outputByType: OutputByType = {}
  for (const outputType of requestedOutputTypes) {
    outputByType[outputType] = {
      html: inputHtml,
      offset: 0,
    }
  }

  for await (const link of extractTextLinks({
    context,
    date,
    europeDb,
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
          if (referredLegifranceTextsInfos) {
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
            title: referenceTitleJson(article, link.reference),
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
          if (referredLegifranceTextsInfos) {
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
            title: referenceTitleJson(division, link.reference),
          },
          id: sectionTaId,
          originalTransformation,
          outputByType,
        })
        break
      }

      case "european_text": {
        const { url: href, originalTransformation, text, titleId } = link
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
        // if (referredLegifranceTextsInfos) {
        //   referredLegifranceTextCountByCid[text.cid] =
        //     (referredLegifranceTextCountByCid[text.cid] ?? 0) + 1
        // }
        addReferenceToOutputs({
          attributes: {
            class: "reference_texte",
            style: "background-color: #eae462",
            title: referenceTitleJson(text, link.reference),
          },
          id: titleId,
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
          if (referredLegifranceTextsInfos) {
            referredLegifranceTextCountByCid[text.cid] =
              (referredLegifranceTextCountByCid[text.cid] ?? 0) + 1
          }
        }
        addReferenceToOutputs({
          attributes: {
            class: "reference_texte",
            style: "background-color: #eae462",
            title: referenceTitleJson(text, link.reference),
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

  return { outputByType, referredLegifranceTextCountByCid }
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
