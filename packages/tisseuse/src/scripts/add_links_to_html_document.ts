import assert from "assert"
import fs from "fs-extra"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import type { JorfArticle } from "$lib/legal/jorf.js"
import type { LegiArticle } from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"
import type {
  TextAstArticle,
  TextAstLocalizationRelative,
  TextAstPosition,
  TextAstText,
} from "$lib/text_parsers/ast.js"
import {
  iterAtomicOrParentChildReferences,
  iterAtomicReferences,
} from "$lib/text_parsers/helpers.js"
import { iterReferences } from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_simplifiers.js"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  outputDocumentPath: string,
  {
    date,
    "default-text": defaultTextId,
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
  }: {
    date: string
    "default-text"?: string
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  assert.notStrictEqual(date, undefined, "Date option is required")

  let currentArticleId: string | undefined = undefined
  let currentCodeId: string | undefined = undefined
  let currentConstitutionId: string | undefined = undefined
  let currentLawId: string | undefined = undefined
  let currentTextId: string | undefined = undefined

  const conversion = simplifyHtml({ removeAWithHref: true })(
    await fs.readFile(inputDocumentPath, { encoding: "utf-8" }),
  )
  const inputHtml = conversion.text

  // const inputHtml = `3° À l’avant‑dernier alinéa de l’article 193, au 5 du I de l’article 197, à la première phrase du second alinéa du 4 de l’article 199 sexdecies, à la première phrase du premier alinéa du 7 de l’article 200 quater, à la première phrase du 7 de l’article 200 quater A, à la troisième phrase du premier alinéa de l’article 200 quater B, à la première phrase du premier alinéa du 9 de l’article 200 quater C, à la première phrase du III de l’article 200 undecies, à la première phrase du VII de l’article 200 quaterdecies et à la première phrase du dernier alinéa du II de l’article 200 sexdecies, la référence : « 199 quater B » est remplacée par la référence : « 199 quater F » ; `
  // const inputHtml = `I. – Le II de l’article 46 de la loi n° 2005‑1719 du 30 décembre 2005 de finances pour 2006 est ainsi modifié :`
  //  const inputHtml = `
  //    «&nbsp;2°&nbsp;L’impôt sur le revenu mentionné au&nbsp;2° du&nbsp;III est majoré de l’avantage en impôt procuré par les réductions d’impôt prévues à l’article&nbsp;199&nbsp;<span style="font-style:italic">quater</span>&nbsp;B, à l’article&nbsp;199&nbsp;<span style="font-style:italic">undecies</span>&nbsp;B, à l’exception des dix&nbsp;derniers alinéas du&nbsp;I, à l’article&nbsp;238&nbsp;<span style="font-style:italic">bis</span> et à l’article&nbsp;107 de la loi&nbsp;n°&nbsp;2021‑1104 du 22&nbsp;août&nbsp;2021 portant lutte contre le dérèglement climatique et renforcement de la résilience face à ses effets, ainsi que de l’avantage en impôt procuré par les crédits d’impôt prévus à l’article&nbsp;200&nbsp;<span style="font-style:italic">undecies</span>, aux articles 244&nbsp;<span style="font-style:italic">quater</span>&nbsp;B à 244&nbsp;<span style="font-style:italic">quater</span>&nbsp;W et aux articles 27 et 151 de la loi&nbsp;n°&nbsp;2020‑1721 du 29&nbsp;décembre&nbsp;2020 de finances pour 2021, et par les crédits d’impôt prévus par les conventions fiscales internationales, dans la limite de l’impôt dû.
  // `
  //    .replaceAll("&nbsp;", " ")
  //    .replaceAll("İ", "I")

  const context = new TextParserContext(inputHtml)
  let outputHtml = inputHtml
  let outputOffset = 0

  async function addLinkToArticle(
    article: TextAstArticle,
    text?: (TextAstText & TextAstPosition) | undefined,
    isSingleAtomicReferenceInText?: boolean | undefined,
  ): Promise<void> {
    if (
      (article.localization as TextAstLocalizationRelative)?.relative === 0 &&
      currentArticleId !== undefined
    ) {
      // "le même article", "le présent article", etc
      // Do nothing.
      return
    }
    let articlesInfos: Array<{
      data: JorfArticle | LegiArticle
      id: string
    }> = []
    if (currentTextId !== undefined) {
      articlesInfos = [
        ...(await db<
          {
            data: JorfArticle | LegiArticle
            id: string
          }[]
        >`
          SELECT data, id
          FROM article
          WHERE
            data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${currentTextId}
            AND data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${article.num ?? null}
        `),
      ]
    }
    if (
      articlesInfos.length === 0 &&
      defaultTextId !== undefined &&
      defaultTextId !== currentTextId
    ) {
      articlesInfos = [
        ...(await db<
          {
            data: JorfArticle | LegiArticle
            id: string
          }[]
        >`
          SELECT data, id
          FROM article
          WHERE
            data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${defaultTextId}
            AND data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${article.num ?? null}
        `),
      ]
    }
    if (
      articlesInfos.length === 0 &&
      typeof article.num === "string" &&
      /^L\d+-\d+$/.test(article.num)
    ) {
      // Look whether there exists only one text with this article number.
      articlesInfos = [
        ...(await db<
          {
            data: JorfArticle | LegiArticle
            id: string
          }[]
        >`
          SELECT data, id
          FROM article
          WHERE
            data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${article.num}
        `),
      ]
      if (articlesInfos.length !== 0) {
        const textsIds = articlesInfos.reduce((textsIds, { data }) => {
          const textId = data.CONTEXTE.TEXTE["@cid"]
          if (textId !== undefined) {
            textsIds.add(textId)
          }
          return textsIds
        }, new Set<string>())
        if (textsIds.size > 1) {
          // Different texts have an article with the same number.
          // So try another method.
          articlesInfos = []
        }
      }
    }
    if (articlesInfos.length === 0) {
      console.warn(
        `Unknown article ${article.num ?? null} of text ${currentTextId} for reference ${JSON.stringify(article, null, 2)}`,
      )
      currentArticleId = undefined
    } else if (articlesInfos.length === 1) {
      currentArticleId = articlesInfos[0].id
    } else {
      let filteredArticlesInfos = articlesInfos.filter(({ data }) => {
        const metaArticle = data.META.META_SPEC.META_ARTICLE
        return metaArticle.DATE_DEBUT <= date && metaArticle.DATE_FIN > date
      })
      if (filteredArticlesInfos.length === 1) {
        currentArticleId = filteredArticlesInfos[0].id
      } else {
        if (filteredArticlesInfos.length !== 0) {
          articlesInfos = filteredArticlesInfos
        }
        filteredArticlesInfos = articlesInfos.filter(
          ({ id }) =>
            !currentTextId?.startsWith("JORF") || id.startsWith("JORF"),
        )
        if (filteredArticlesInfos.length === 1) {
          currentArticleId = filteredArticlesInfos[0].id
        } else {
          if (filteredArticlesInfos.length !== 0) {
            articlesInfos = filteredArticlesInfos
          }
          console.warn(
            `Unable to filter the article ${article.num ?? null} of text ${currentTextId ?? null} among IDs ${JSON.stringify(
              articlesInfos.map(({ id }) => id),
              null,
              2,
            )} for reference ${JSON.stringify(article, null, 2)}`,
          )
          currentArticleId = undefined
        }
      }
    }

    if (currentArticleId !== undefined) {
      const position =
        text !== undefined && isSingleAtomicReferenceInText
          ? text.position!
          : article.position!
      assert.notStrictEqual(position, undefined)
      const original = outputHtml.substring(
        position.start + outputOffset,
        position.stop + outputOffset,
      )
      const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(currentArticleId, ".md")}">${original}</a>`
      outputHtml =
        outputHtml.substring(0, position.start + outputOffset) +
        replacement +
        outputHtml.substring(position.stop + outputOffset)
      outputOffset += replacement.length - original.length
    }
  }

  for (const reference of iterReferences(context)) {
    if (logReferences) {
      console.log(JSON.stringify(reference, null, 2))
    }
    for (const atomicOrParentChildReference of iterAtomicOrParentChildReferences(
      reference,
    )) {
      const atomicReference =
        atomicOrParentChildReference.type === "parent-enfant"
          ? atomicOrParentChildReference.parent
          : atomicOrParentChildReference
      const parentChildReference =
        atomicOrParentChildReference.type === "parent-enfant"
          ? atomicOrParentChildReference
          : undefined
      assert.notStrictEqual(atomicReference.type, "parent-enfant")
      assert.notStrictEqual(atomicReference.type, "reference_et_action")
      switch (atomicReference.type) {
        case "incomplete-header":
        case "partie":
        case "alinéa":
        case "phrase": {
          // Ignore sub-article & incomplete-header references.
          break
        }

        case "article": {
          await addLinkToArticle(atomicReference)
          break
        }

        case "livre":
        case "chapitre":
        case "paragraphe":
        case "sous-paragraphe":
        case "section":
        case "sous-section":
        case "titre": {
          // TODO supra-article references
          break
        }

        case "texte": {
          switch (atomicReference.nature) {
            case "ARRETE":
            case "CIRCULAIRE":
            case "CONVENTION":
            case "DECRET":
            case "DECRET_LOI":
            case "DIRECTIVE_EURO":
            case "REGLEMENTEUROPEEN": {
              // TODO
              currentTextId = undefined
              break
            }

            case "CODE": {
              if (
                (atomicReference.localization as TextAstLocalizationRelative)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentCodeId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
                  )
                }
                currentTextId = undefined
                break
              }

              currentTextId = currentCodeId = atomicReference.cid
              break
            }

            case "CONSTITUTION": {
              if (
                (atomicReference.localization as TextAstLocalizationRelative)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentConstitutionId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
                  )
                }
                currentTextId = undefined
                break
              }

              currentTextId = currentConstitutionId = atomicReference.cid
              break
            }

            case "LOI":
            case "LOI_CONSTIT":
            case "LOI_ORGANIQUE":
            case "ORDONNANCE": {
              if (
                (atomicReference.localization as TextAstLocalizationRelative)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentLawId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
                  )
                }
                currentTextId = undefined
                break
              }

              currentTextId = currentLawId = atomicReference.cid
              break
            }

            default:
              assertNever("nature", atomicReference.nature)
          }

          const atomicReferencesInText =
            parentChildReference === undefined
              ? []
              : [...iterAtomicReferences(parentChildReference.child)]
          let addedLinksCount = 0
          for (const atomicReferenceInText of atomicReferencesInText) {
            switch (atomicReferenceInText.type) {
              case "incomplete-header":
              case "partie":
              case "alinéa":
              case "phrase": {
                // Ignore sub-article & incomplete-header references.
                break
              }

              case "article": {
                await addLinkToArticle(
                  atomicReferenceInText,
                  atomicReference,
                  atomicReferencesInText.length === 1,
                )
                addedLinksCount++
                break
              }

              case "livre":
              case "chapitre":
              case "paragraphe":
              case "sous-paragraphe":
              case "section":
              case "sous-section":
              case "titre": {
                // TODO supra-article references
                break
              }

              default:
                if (logIgnoredReferencesTypes) {
                  console.log(
                    `Reference of type ${atomicReferenceInText.type} ignored in text`,
                  )
                  console.log(JSON.stringify(reference, null, 2))
                }
            }
          }
          if (addedLinksCount === 0 && currentTextId !== undefined) {
            const position = atomicReference.position!
            assert.notStrictEqual(position, undefined)
            const original = outputHtml.substring(
              position.start + outputOffset,
              position.stop + outputOffset,
            )
            const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(currentTextId, ".md")}">${original}</a>`
            outputHtml =
              outputHtml.substring(0, position.start + outputOffset) +
              replacement +
              outputHtml.substring(position.stop + outputOffset)
            outputOffset += replacement.length - original.length
          }
          break
        }

        default:
          // assertNever("AtomicReference", atomicReference)
          if (logIgnoredReferencesTypes) {
            console.log(
              `Reference ${JSON.stringify(atomicReference, null, 2)} ignored`,
            )
            console.log(JSON.stringify(reference, null, 2))
          }
      }
    }
  }

  await fs.writeFile(outputDocumentPath, outputHtml, { encoding: "utf-8" })
  return 0
}

sade("add_links_to_html_document <input_document> <output_document>", true)
  .describe("Add links to an HTML document")
  .option("-d, --date", "Date of HTML document in YYYY-MM-DD format")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-l, --default-text",
    "Optional Légifrance ID of the code or text to use when an article reference is ambiguous",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .action(async (inputDocumentPath, outputDocumentPath, options) => {
    process.exit(
      await addLinksToHtmlDocument(
        inputDocumentPath,
        outputDocumentPath,
        options,
      ),
    )
  })
  .parse(process.argv)
