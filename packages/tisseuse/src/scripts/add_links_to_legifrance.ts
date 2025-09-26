import {
  gitPathFromId,
  JorfArticle,
  LegiArticle,
} from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { legiDb } from "$lib/server/databases/index.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import {
  iterOriginalMergedPositionsFromTransformed,
  type Transformation,
} from "$lib/text_parsers/transformers.js"
import {
  readTransformation,
  writeTransformation,
} from "$lib/server/text_parsers/transformers.js"

const today = new Date().toISOString().split("T")[0]

async function addLinksToLegifrance(
  textCid: string,
  {
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
  }: {
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  for await (const articleRows of legiDb<
    Array<{ data: JorfArticle | LegiArticle; id: string }>
  >`
    SELECT data, id FROM article
    WHERE id in (
      SELECT id
      FROM article
      WHERE data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${textCid}
    )
  `.cursor(100)) {
    for (const { data: article, id } of articleRows) {
      const date = article.META.META_SPEC.META_ARTICLE.DATE_DEBUT
      const outputByFieldName: {
        bloc_textuel?: string
        nota?: string
      } = {}
      for (const [fieldName, inputHtml] of [
        ["bloc_textuel", article.BLOC_TEXTUEL?.CONTENU],
        ["nota", (article as LegiArticle).NOTA?.CONTENU],
      ] as Array<[keyof typeof outputByFieldName, string | undefined]>) {
        if (inputHtml === undefined) {
          continue
        }
        const transformation = simplifyHtml({ removeAWithHref: true })(
          inputHtml,
        )
        const inputText = transformation.output
        const context = new TextParserContext(inputText)
        const originalPositionsFromTransformedIterator =
          iterOriginalMergedPositionsFromTransformed(transformation)
        // Initialize iterator by sending a dummy value and ignoring the result.
        originalPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
        let output = inputHtml
        let outputOffset = 0

        for await (const link of iterTextLinks(context, {
          date,
          defaultTextId: textCid, // TODO: Replace with undefined,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences,
        })) {
          switch (link.type) {
            case "article_definition": {
              // Example: LEGIARTI000006312473
              // La gestion comptable et financière du fonds national de garantie des calamités agricoles est assurée selon les dispositions de l'article L. 431-11 du code des assurances ci-après reproduit :
              //
              // Art. L. 431-11 - La gestion comptable et financière du fonds national de garantie des calamités agricoles mentionné à l'article L. 442-1 est assurée par la caisse centrale de réassurance dans un compte distinct de ceux qui retracent les autres opérations pratiquées par cet établissement.
              //
              // => Ignore it.
              break
            }

            case "external_article": {
              const { articleId, position: articlePosition } = link
              const result =
                originalPositionsFromTransformedIterator.next(articlePosition)
              if (result.done) {
                console.error(
                  `In article ${id}, transformation of link to article ${articleId} position to HTML failed:`,
                  articlePosition,
                )
                process.exit(1)
              }
              const articleReverseTransformation = result.value
              const original =
                (articleReverseTransformation.innerPrefix ?? "") +
                output.slice(
                  articleReverseTransformation.position.start + outputOffset,
                  articleReverseTransformation.position.stop + outputOffset,
                ) +
                (articleReverseTransformation.innerSuffix ?? "")
              const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
              output =
                output.slice(
                  0,
                  articleReverseTransformation.position.start + outputOffset,
                ) +
                replacement +
                output.slice(
                  articleReverseTransformation.position.stop + outputOffset,
                )
              outputOffset +=
                replacement.length -
                (articleReverseTransformation.position.stop -
                  articleReverseTransformation.position.start)
              break
            }

            case "external_division": {
              const { position: divisionPosition, sectionTaId } = link
              const result =
                originalPositionsFromTransformedIterator.next(divisionPosition)
              if (result.done) {
                console.error(
                  `In article ${id}, transformation of division position to HTML failed:`,
                  divisionPosition,
                )
                process.exit(1)
              }
              const divisionReverseTransformation = result.value
              const original =
                (divisionReverseTransformation.innerPrefix ?? "") +
                output.slice(
                  divisionReverseTransformation.position.start + outputOffset,
                  divisionReverseTransformation.position.stop + outputOffset,
                ) +
                (divisionReverseTransformation.innerSuffix ?? "")
              const replacement = `${divisionReverseTransformation.outerPrefix ?? ""}<a class="lien_division_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>${divisionReverseTransformation.outerSuffix ?? ""}`
              output =
                output.slice(
                  0,
                  divisionReverseTransformation.position.start + outputOffset,
                ) +
                replacement +
                output.slice(
                  divisionReverseTransformation.position.stop + outputOffset,
                )
              outputOffset +=
                replacement.length -
                (divisionReverseTransformation.position.stop -
                  divisionReverseTransformation.position.start)
              break
            }

            case "external_text": {
              const { text, position: textPosition } = link
              if (text.cid === undefined) {
                if (text.relative !== 0) {
                  // It is not "la présente loi".
                  throw new Error(
                    `In article ${id}, link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
                  )
                }
                continue
              }

              const result =
                originalPositionsFromTransformedIterator.next(textPosition)
              if (result.done) {
                console.error(
                  `In article ${id}, transformation of text position to HTML failed:`,
                  textPosition,
                )
                process.exit(1)
              }
              const textReverseTransformation = result.value
              const original =
                (textReverseTransformation.innerPrefix ?? "") +
                output.slice(
                  textReverseTransformation.position.start + outputOffset,
                  textReverseTransformation.position.stop + outputOffset,
                ) +
                (textReverseTransformation.innerSuffix ?? "")
              const replacement = `${textReverseTransformation.outerPrefix ?? ""}<a class="lien_texte_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>${textReverseTransformation.outerSuffix ?? ""}`
              output =
                output.slice(
                  0,
                  textReverseTransformation.position.start + outputOffset,
                ) +
                replacement +
                output.slice(
                  textReverseTransformation.position.stop + outputOffset,
                )
              outputOffset +=
                replacement.length -
                (textReverseTransformation.position.stop -
                  textReverseTransformation.position.start)
              break
            }

            case "internal_article": {
              const { definition, position: articlePosition } = link
              const result =
                originalPositionsFromTransformedIterator.next(articlePosition)
              if (result.done) {
                console.error(
                  `In article ${id}, transformation of article position to HTML failed:`,
                  articlePosition,
                )
                process.exit(1)
              }
              const articleReverseTransformation = result.value
              const original =
                (articleReverseTransformation.innerPrefix ?? "") +
                output.slice(
                  articleReverseTransformation.position.start + outputOffset,
                  articleReverseTransformation.position.stop + outputOffset,
                ) +
                (articleReverseTransformation.innerSuffix ?? "")
              const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
              output =
                output.slice(
                  0,
                  articleReverseTransformation.position.start + outputOffset,
                ) +
                replacement +
                output.slice(
                  articleReverseTransformation.position.stop + outputOffset,
                )
              outputOffset +=
                replacement.length -
                (articleReverseTransformation.position.stop -
                  articleReverseTransformation.position.start)
              break
            }

            default: {
              assertNever("Link", link)
            }
          }
          outputByFieldName[fieldName] = output
        }
      }
      if (
        Object.values(outputByFieldName).every((output) => output === undefined)
      ) {
        await legiDb`
          DELETE FROM article_contenu_avec_liens
          WHERE id = ${id}
        `
      } else {
        await legiDb`
          INSERT INTO article_contenu_avec_liens (
            id,
            bloc_textuel,
            date_extraction_liens,
            nota
          ) VALUES (
            ${id},
            ${outputByFieldName.bloc_textuel ?? null},
            ${today},
            ${outputByFieldName.nota ?? null}
          )
          ON CONFLICT (id)
          DO UPDATE SET
            bloc_textuel = excluded.bloc_textuel,
            nota = excluded.nota
        `
      }
    }
  }
  return 0
}

sade("add_links_to_legifrance <text_cid>", true)
  .describe("Add links to Légifrance texts and articles")
  .option("-I, --log-ignored", "Log ignored references types")
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .action(async (textCid, options) => {
    process.exit(await addLinksToLegifrance(textCid, options))
  })
  .parse(process.argv)
