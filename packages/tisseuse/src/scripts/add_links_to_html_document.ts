import assert from "assert"
import fs from "fs-extra"
import metslesliens, {
  type ArticleReference,
  type LawReference,
} from "metslesliens"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import type { JorfArticle, JorfTexteVersion } from "$lib/legal/jorf.js"
import type { LegiArticle, LegiTexteVersion } from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"
import { slugify } from "$lib/strings.js"

async function addLinksToHtmlDocument(
  inputDocumentPath: string,
  outputDocumentPath: string,
  {
    date,
    "default-text": defaultTextId,
    "log-ignored": logIgnoredReferencesTypes,
    "log-references": logReferences,
  }: {
    date: string
    "default-text"?: string
    "log-ignored"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  assert.notStrictEqual(date, undefined, "Date option is required")

  const idsBySlugByNature = new Map<string, Map<string, string[]>>()
  for (const nature of ["CODE", "CONSTITUTION", "DECLARATION"]) {
    let idsBySlug = idsBySlugByNature.get(nature)!
    if (idsBySlug === undefined) {
      idsBySlug = new Map<string, string[]>()
      idsBySlugByNature.set(nature, idsBySlug)
    }
    for (const { data: texteVersion, id } of await db<
      { data: LegiTexteVersion; id: string }[]
    >`
      SELECT data, id
      FROM texte_version
      WHERE
        nature = ${nature}
        and id LIKE 'LEGITEXT%'
    `) {
      const title = texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL
      if (title !== undefined) {
        const slug = slugify(title, " ")
        let ids = idsBySlug.get(slug)!
        if (ids === undefined) {
          ids = []
          idsBySlug.set(slug, ids)
        }
        ids.push(id)
      }
    }
  }

  let currentArticleId: string | undefined = undefined
  let currentCodeId: string | undefined = undefined
  let currentConstitutionId: string | undefined = undefined
  let currentLawId: string | undefined = undefined
  let currentTextId: string | undefined = undefined

  const inputHtml = decodeNumericHtmlEntities(
    await fs.readFile(inputDocumentPath, { encoding: "utf-8" }),
  )
    .replaceAll("&nbsp;", " ")
    // Le İ peut-être utilisé, sans doute pour différencier la lettre I du chiffre romain I.
    // Par exemple : article 199 decies İ du code général des impôts.
    // Mais Légifrance utilise un I classique…
    .replaceAll("İ", "I")

  // const inputHtml = `3° À l’avant‑dernier alinéa de l’article 193, au 5 du I de l’article 197, à la première phrase du second alinéa du 4 de l’article 199 sexdecies, à la première phrase du premier alinéa du 7 de l’article 200 quater, à la première phrase du 7 de l’article 200 quater A, à la troisième phrase du premier alinéa de l’article 200 quater B, à la première phrase du premier alinéa du 9 de l’article 200 quater C, à la première phrase du III de l’article 200 undecies, à la première phrase du VII de l’article 200 quaterdecies et à la première phrase du dernier alinéa du II de l’article 200 sexdecies, la référence : « 199 quater B » est remplacée par la référence : « 199 quater F » ; `
  // const inputHtml = `I. – Le II de l’article 46 de la loi n° 2005‑1719 du 30 décembre 2005 de finances pour 2006 est ainsi modifié :`
  //  const inputHtml = `
  //    «&nbsp;2°&nbsp;L’impôt sur le revenu mentionné au&nbsp;2° du&nbsp;III est majoré de l’avantage en impôt procuré par les réductions d’impôt prévues à l’article&nbsp;199&nbsp;<span style="font-style:italic">quater</span>&nbsp;B, à l’article&nbsp;199&nbsp;<span style="font-style:italic">undecies</span>&nbsp;B, à l’exception des dix&nbsp;derniers alinéas du&nbsp;I, à l’article&nbsp;238&nbsp;<span style="font-style:italic">bis</span> et à l’article&nbsp;107 de la loi&nbsp;n°&nbsp;2021‑1104 du 22&nbsp;août&nbsp;2021 portant lutte contre le dérèglement climatique et renforcement de la résilience face à ses effets, ainsi que de l’avantage en impôt procuré par les crédits d’impôt prévus à l’article&nbsp;200&nbsp;<span style="font-style:italic">undecies</span>, aux articles 244&nbsp;<span style="font-style:italic">quater</span>&nbsp;B à 244&nbsp;<span style="font-style:italic">quater</span>&nbsp;W et aux articles 27 et 151 de la loi&nbsp;n°&nbsp;2020‑1721 du 29&nbsp;décembre&nbsp;2020 de finances pour 2021, et par les crédits d’impôt prévus par les conventions fiscales internationales, dans la limite de l’impôt dû.
  // `
  //    .replaceAll("&nbsp;", " ")
  //    .replaceAll("İ", "I")

  let outputHtml = inputHtml
  let outputOffset = 0

  async function addLinkToArticleReference(
    articleReference: ArticleReference,
    lawReference?: LawReference | undefined,
    isSingleAtomicChildOfLawReference?: boolean | undefined,
  ): Promise<void> {
    if (
      (articleReference.indirect as metslesliens.Indirect)?.relative === 0 &&
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
            AND data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${articleReference.id ?? null}
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
            AND data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${articleReference.id ?? null}
        `),
      ]
    }
    if (
      articlesInfos.length === 0 &&
      typeof articleReference.id === "string" &&
      /^L\d+-\d+$/.test(articleReference.id)
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
            data -> 'META' -> 'META_SPEC' -> 'META_ARTICLE' ->> 'NUM' = ${articleReference.id}
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
        `Unknown article ${articleReference.id ?? null} of law ${currentTextId} for reference ${JSON.stringify(articleReference, null, 2)}`,
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
            `Unable to filter the article ${articleReference.id ?? null} of law ${currentTextId ?? null} among IDs ${JSON.stringify(
              articlesInfos.map(({ id }) => id),
              null,
              2,
            )} for reference ${JSON.stringify(articleReference, null, 2)}`,
          )
          currentArticleId = undefined
        }
      }
    }

    if (currentArticleId !== undefined) {
      const position =
        lawReference !== undefined && isSingleAtomicChildOfLawReference
          ? lawReference.position!
          : articleReference.position!
      assert.notStrictEqual(position, undefined)
      const original = outputHtml.substring(
        position.start.offset + outputOffset,
        position.end.offset + outputOffset,
      )
      const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(currentArticleId, ".md")}">${original}</a>`
      outputHtml =
        outputHtml.substring(0, position.start.offset + outputOffset) +
        replacement +
        outputHtml.substring(position.end.offset + outputOffset)
      outputOffset += replacement.length - original.length
    }
  }

  for (const link of metslesliens.iterLinks(
    inputHtml /* , metslesliens.getParser() */,
  )) {
    if (logReferences) {
      console.log(JSON.stringify(link, null, 2))
    }
    for (const atomicReference of metslesliens.iterAtomicReferences(
      link.tree,
    )) {
      switch (atomicReference.type) {
        case "alinea-reference":
        case "portion-reference": {
          // Ignore sub-article refereneces.
          break
        }

        case "article-reference": {
          await addLinkToArticleReference(atomicReference)
          break
        }

        case "book-reference":
        case "chapter-reference":
        case "code-part-reference":
        case "paragraph-reference":
        case "section-reference":
        case "title-reference": {
          // TODO supra-article references
          break
        }

        case "law-reference": {
          switch (atomicReference.lawType) {
            case "arrêté":
            case "convention":
            case "décret":
            case "directive":
            case "règlement":
            case "ordonnance": {
              // TODO
              currentTextId = undefined
              break
            }

            case "code": {
              if (
                (atomicReference.indirect as metslesliens.Indirect)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentCodeId
                break
              }

              let ids: string[] | undefined = undefined
              if (typeof atomicReference.id === "string") {
                const slug = slugify(atomicReference.id, " ")
                ids = idsBySlugByNature
                  .get(atomicReference.lawType.toUpperCase())
                  ?.get(slug)
                assert.notStrictEqual(
                  ids,
                  undefined,
                  `Unknown code with slug "${slug}" for reference ${JSON.stringify(atomicReference, null, 2)}`,
                )
                assert.strictEqual(
                  ids!.length,
                  1,
                  `Several codes share the same slug "${slug}": ${JSON.stringify(ids)} for referennce  ${JSON.stringify(atomicReference, null, 2)}`,
                )
              } else {
                throw new TypeError(
                  `Invalid type ${typeof atomicReference.id} of id ${atomicReference.id} for reference ${JSON.stringify(atomicReference, null, 2)}`,
                )
              }
              currentTextId = currentCodeId = ids![0]
              break
            }

            case "constitution": {
              if (
                (atomicReference.indirect as metslesliens.Indirect)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentConstitutionId
                break
              }

              let ids: string[] | undefined = undefined
              if (typeof atomicReference.id === "string") {
                let slug = slugify(atomicReference.id, " ")
                if (slug === "constitution") {
                  slug = slugify("Constitution du 4 octobre 1958", " ")
                }
                ids = idsBySlugByNature
                  .get(atomicReference.lawType.toUpperCase())
                  ?.get(slug)
                assert.notStrictEqual(
                  ids,
                  undefined,
                  `Unknown constitution with slug "${slug}" for reference ${JSON.stringify(atomicReference, null, 2)}`,
                )
                assert.strictEqual(
                  ids!.length,
                  1,
                  `Several constitutions share the same slug "${slug}": ${JSON.stringify(ids)} for referennce  ${JSON.stringify(atomicReference, null, 2)}`,
                )
              } else {
                throw new TypeError(
                  `Invalid type ${typeof atomicReference.id} of id ${atomicReference.id} for reference ${JSON.stringify(atomicReference, null, 2)}`,
                )
              }
              currentTextId = currentConstitutionId = ids![0]
              break
            }

            case "loi":
            case "loi constitutionnelle":
            case "loi organique": {
              if (
                (atomicReference.indirect as metslesliens.Indirect)
                  ?.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentLawId
                break
              }

              if (typeof atomicReference.id === "string") {
                const nature = {
                  loi: "LOI",
                  "loi constitutionnelle": "LOI_CONSTIT",
                  "loi organique": "LOI_ORGANIQUE",
                }[atomicReference.lawType]
                const natureEtNum = `${nature}.${atomicReference.id}`
                let lawsInfos = [
                  ...(await db<
                    {
                      data: JorfTexteVersion | LegiTexteVersion
                      est_texte_principal: boolean
                      id: string
                    }[]
                  >`
                    SELECT data, est_texte_principal, id
                    FROM texte_version
                    WHERE
                      nature_et_num = ${natureEtNum}
                  `),
                ]
                assert.notStrictEqual(
                  lawsInfos.length,
                  0,
                  `Unknown ${nature} ${atomicReference.id} for reference ${JSON.stringify(atomicReference, null, 2)}`,
                )
                if (lawsInfos.length === 1) {
                  currentLawId = lawsInfos[0].id
                } else {
                  let filteredLawsInfos = lawsInfos.filter(({ id }) =>
                    id.startsWith("JORFTEXT"),
                  )
                  if (filteredLawsInfos.length === 1) {
                    currentLawId = filteredLawsInfos[0].id
                  } else {
                    if (filteredLawsInfos.length !== 0) {
                      lawsInfos = filteredLawsInfos
                    }
                    filteredLawsInfos = lawsInfos.filter(
                      ({ data }) =>
                        !data.META.META_SPEC.META_TEXTE_VERSION.TITREFULL?.endsWith(
                          " (rectificatif)",
                        ),
                    )
                    if (filteredLawsInfos.length === 1) {
                      currentLawId = filteredLawsInfos[0].id
                    } else {
                      if (filteredLawsInfos.length !== 0) {
                        lawsInfos = filteredLawsInfos
                      }
                      filteredLawsInfos = lawsInfos.filter(
                        ({ est_texte_principal }) => est_texte_principal,
                      )
                      if (filteredLawsInfos.length === 1) {
                        currentLawId = filteredLawsInfos[0].id
                      } else {
                        if (filteredLawsInfos.length !== 0) {
                          lawsInfos = filteredLawsInfos
                        }
                        throw new Error(
                          `Unable to filter the main law ${nature} ${atomicReference.id} among IDs ${JSON.stringify(
                            lawsInfos.map(({ id }) => id),
                            null,
                            2,
                          )} for reference ${JSON.stringify(atomicReference, null, 2)}`,
                        )
                        // currentLawId = undefined
                      }
                    }
                  }
                }
              }
              currentTextId = currentLawId
              break
            }

            default:
              assertNever("lawType", atomicReference.lawType)
          }

          const atomicReferencesInLaw =
            atomicReference.child === undefined
              ? []
              : [...metslesliens.iterAtomicReferences(atomicReference.child)]
          let addedLinksCount = 0
          for (const atomicReferenceInLaw of atomicReferencesInLaw) {
            switch (atomicReferenceInLaw.type) {
              case "alinea-reference":
              case "portion-reference": {
                // Ignore sub-article refereneces.
                break
              }

              case "article-reference": {
                await addLinkToArticleReference(
                  atomicReferenceInLaw,
                  atomicReference,
                  atomicReferencesInLaw.length === 1,
                )
                addedLinksCount++
                break
              }

              case "book-reference":
              case "chapter-reference":
              case "code-part-reference":
              case "paragraph-reference":
              case "section-reference":
              case "title-reference": {
                // TODO supra-article references
                break
              }

              default:
                if (logIgnoredReferencesTypes) {
                  console.log(
                    `Reference of type ${atomicReferenceInLaw.type} ignored in law-reference`,
                  )
                  console.log(JSON.stringify(link, null, 2))
                }
            }
          }
          if (addedLinksCount === 0 && currentTextId !== undefined) {
            const position = atomicReference.position!
            assert.notStrictEqual(position, undefined)
            const original = outputHtml.substring(
              position.start.offset + outputOffset,
              position.end.offset + outputOffset,
            )
            const replacement = `<a href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(currentTextId, ".md")}">${original}</a>`
            outputHtml =
              outputHtml.substring(0, position.start.offset + outputOffset) +
              replacement +
              outputHtml.substring(position.end.offset + outputOffset)
            outputOffset += replacement.length - original.length
          }
          break
        }

        default:
          if (logIgnoredReferencesTypes) {
            console.log(`Reference of type ${atomicReference.type} ignored`)
            console.log(JSON.stringify(link, null, 2))
          }
      }
    }
  }

  await fs.writeFile(outputDocumentPath, outputHtml, { encoding: "utf-8" })
  return 0
}

/**
 * Replaces numeric HTML character references (decimal and hexadecimal)
 * in a string with their corresponding UTF-8 characters.
 * Note: This does *not* decode named entities like &amp; or &nbsp;.
 *
 * @param htmlString The string containing HTML character references.
 * @returns The string with numeric references decoded.
 */
function decodeNumericHtmlEntities(htmlString: string): string {
  let processedString = htmlString

  // Decode decimal references (e.g., &#65;)
  processedString = processedString.replace(/&#(\d+);/g, (match, dec) => {
    try {
      const charCode = parseInt(dec, 10)
      // Check for invalid or non-printable control characters if needed,
      // though fromCharCode handles many cases gracefully.
      if (isNaN(charCode)) {
        return match // Return original match if parsing fails
      }
      return String.fromCharCode(charCode)
    } catch (e) {
      console.error(`Failed to parse decimal entity: ${match}`, e)
      return match // Keep original if error occurs
    }
  })

  // Decode hexadecimal references (e.g., &#x41;)
  processedString = processedString.replace(
    /&#x([0-9a-fA-F]+);/gi,
    (match, hex) => {
      try {
        const charCode = parseInt(hex, 16)
        if (isNaN(charCode)) {
          return match // Return original match if parsing fails
        }
        return String.fromCharCode(charCode)
      } catch (e) {
        console.error(`Failed to parse hexadecimal entity: ${match}`, e)
        return match // Keep original if error occurs
      }
    },
  )

  return processedString
}

sade("add_links_to_html_document <input_document> <output_document>", true)
  .describe("Use metslesliens to add links to an HTML document")
  .option("-d, --date", "Date of HTML document in YYYY-MM-DD format")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-l, --default-text",
    "Optional Légifrance ID of the code or law to use when an article reference is ambiguous",
  )
  .option("-R, --log-references", "Log Metslesliens references")
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
