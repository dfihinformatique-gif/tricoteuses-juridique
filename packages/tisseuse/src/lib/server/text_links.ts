import assert from "assert"

import { assertNever } from "$lib/asserts.js"
import type { JorfArticle } from "$lib/legal/jorf.js"
import type { LegiArticle } from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"
import type {
  TextAstArticle,
  TextAstLocalizationRelative,
  TextAstPosition,
  TextAstText,
  TextPosition,
} from "$lib/text_parsers/ast.js"
import {
  iterAtomicOrParentChildReferences,
  iterAtomicReferences,
} from "$lib/text_parsers/helpers.js"
import { iterReferences } from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"

export interface ArticleLink {
  article: TextAstArticle
  articleId: string
  position: TextPosition
  text?: TextAstText
  type: "article"
}

export interface TextLink {
  position: TextPosition
  text: TextAstText
  type: "texte"
}

export async function* iterTextLinks(
  context: TextParserContext,
  {
    date,
    defaultTextId,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
  }: {
    date: string
    defaultTextId?: string
    logIgnoredReferencesTypes?: boolean
    logPartialReferences?: boolean
    logReferences?: boolean
  },
): AsyncGenerator<ArticleLink | TextLink, void> {
  assert.notStrictEqual(date, undefined, "Date option is required")

  let currentArticleId: string | undefined = undefined
  let currentCodeId: string | undefined = undefined
  let currentConstitutionId: string | undefined = undefined
  let currentLawId: string | undefined = undefined
  let currentTextId: string | undefined = undefined

  async function* iterArticleLink(
    article: TextAstArticle,
    text?: (TextAstText & TextAstPosition) | undefined,
    isSingleAtomicReferenceInText?: boolean | undefined,
  ): AsyncGenerator<ArticleLink, void> {
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
    if (articlesInfos.length === 0 && article.num !== undefined) {
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
          LIMIT 100
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
      yield {
        article,
        articleId: currentArticleId,
        position,
        text,
        type: "article",
      }
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
          yield* iterArticleLink(atomicReference)
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
                yield* iterArticleLink(
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
            yield {
              position,
              text: atomicReference,
              type: "texte",
            }
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
}
