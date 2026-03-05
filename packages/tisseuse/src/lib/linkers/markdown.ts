import type { Sql } from "postgres"

import { assertNever } from "$lib/asserts.js"
import { extractTextLinks } from "$lib/extractors/links.js"
import { urlFromLegalId, type LinkType } from "$lib/links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyPlainText } from "$lib/text_parsers/simplifiers.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
} from "$lib/text_parsers/transformers.js"

import { escapeMarkdownLinkTitle } from "../markdown.js"

export async function addLinksToText({
  date,
  europeDb,
  legiDb,
  linkBaseUrl,
  linkType,
  previousContext,
  text,
}: {
  date: string
  europeDb: Sql
  legiDb: Sql
  linkBaseUrl: string
  linkType: LinkType
  previousContext?: TextParserContext
  text: string
}): Promise<{ context: TextParserContext; output: string | null }> {
  const transformation = simplifyPlainText(text)
  const context = new TextParserContext(transformation.output)
  context.currentArticle = previousContext?.currentArticle
  context.currentText = previousContext?.currentText
  let output = text
  let outputOffset = 0

  for await (const link of extractTextLinks({
    context,
    date,
    europeDb,
    legiDb,
    // logIgnoredReferencesTypes,
    // logPartialReferences,
    // logReferences,
    // state: { defaultTextId },
    transformation,
  })) {
    switch (link.type) {
      case "article_definition": {
        // TODO: We could use an HTML span to set an ID, butI don't know if Legiwatch will support it.
        // const {
        //   article,
        //   originalTransformation: articleOriginalTransformation,
        //   textId,
        // } = link
        // if (articleOriginalTransformation === undefined) {
        //   throw new Error(
        //     `Missing originalTransformation attribute in article definition: ${JSON.stringify(link, null, 2)}`,
        //   )
        // }
        // const original = reverseTransformedInnerFragment(
        //   output,
        //   articleOriginalTransformation,
        //   outputOffset,
        // )
        // const replacement = reverseTransformedReplacement(
        //   articleOriginalTransformation,
        //   `<span class="definition_article" id="definition_article_${textId}_${article.num!.replaceAll(" ", "_")}">${original}</span>`,
        // )
        // output =
        //   output.slice(
        //     0,
        //     articleOriginalTransformation.position.start +
        //       outputOffset,
        //   ) +
        //   replacement +
        //   output.slice(
        //     articleOriginalTransformation.position.stop +
        //       outputOffset,
        //   )
        // outputOffset +=
        //   replacement.length -
        //   (articleOriginalTransformation.position.stop -
        //     articleOriginalTransformation.position.start)
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
            `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, articleId)})`,
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
            `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, sectionTaId)})`,
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
          `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, text.cid!)})`,
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
          `[${escapeMarkdownLinkTitle(original)}](#definition_article_${definition.textId}_${definition.article.num!.replaceAll(" ", "_")})`,
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

      default: {
        assertNever("Link", link)
      }
    }
  }

  return { context, output: output === text ? null : output }
}
