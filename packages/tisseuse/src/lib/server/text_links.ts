import assert from "assert"

import { assertNever } from "$lib/asserts.js"
import type {
  JorfArticle,
  JorfSectionTa,
  JorfSectionTaLienSectionTa,
  JorfTextelr,
  JorfTextelrLienSectionTa,
} from "$lib/legal/jorf.js"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiSectionTaLienSectionTa,
  LegiTextelr,
  LegiTextelrLienSectionTa,
} from "$lib/legal/legi.js"
import { db } from "$lib/server/databases/index.js"
import {
  isTextAstDivision,
  isTextAstPortion,
  type TextAstArticle,
  type TextAstDivision,
  type TextAstParentChild,
  type TextAstPosition,
  type TextAstReference,
  type TextAstText,
  type TextPosition,
} from "$lib/text_parsers/ast.js"
import { iterAtomicOrParentChildReferences } from "$lib/text_parsers/helpers.js"
import { iterReferences } from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  iterCardinalNumeralFormsFromNumber,
  iterOrdinalNumeralFormsFromNumber,
} from "$lib/numbers.js"

export interface ArticleLink {
  article: TextAstArticle
  articleId: string
  position: TextPosition
  text?: TextAstText & TextAstPosition
  type: "article"
}

export interface DivisionLink {
  division: TextAstDivision & TextAstPosition
  position: TextPosition
  sectionTaId: string
  text?: TextAstText & TextAstPosition
  type: "division"
}

export interface TextLink {
  position: TextPosition
  text: TextAstText & TextAstPosition
  type: "texte"
}

function* iterDeepestDivisionsOrArticles(
  reference: TextAstReference,
): Generator<TextAstArticle | TextAstDivision> {
  if (reference.type === "texte") {
    throw new Error(
      `iterDeepestDivisionsOrArticles must not be called with a text:\n${JSON.stringify(reference, null, 2)}`,
    )
  } else if (isTextAstDivision(reference) || reference.type === "article") {
    yield reference
  } else if (
    isTextAstPortion(reference) ||
    reference.type === "incomplete-header"
  ) {
    // Ignore incomplete or infra-article (aka portion) references.
  } else {
    switch (reference.type) {
      case "bounded-interval": {
        // Caution: This is a approximation.
        yield* iterDeepestDivisionsOrArticles(reference.first)
        yield* iterDeepestDivisionsOrArticles(reference.last)
        break
      }

      case "counted-interval": {
        yield* iterDeepestDivisionsOrArticles(reference.first)
        break
      }

      case "enumeration":
      case "exclusion": {
        yield* iterDeepestDivisionsOrArticles(reference.left)
        yield* iterDeepestDivisionsOrArticles(reference.right)
        break
      }

      case "parent-enfant": {
        const childDeepestDivisionsOrArticles = [
          ...iterDeepestDivisionsOrArticles(reference.child),
        ]
        if (childDeepestDivisionsOrArticles.length === 0) {
          yield* iterDeepestDivisionsOrArticles(reference.parent)
        } else {
          yield* childDeepestDivisionsOrArticles
        }
        break
      }

      case "reference_et_action": {
        yield* iterDeepestDivisionsOrArticles(reference.reference)
        break
      }

      default: {
        assertNever("iterDeepestDivisionsOrArticles reference.type", reference)
      }
    }
  }
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
): AsyncGenerator<ArticleLink | DivisionLink | TextLink, void> {
  assert.notStrictEqual(date, undefined, "Date option is required")

  let currentArticleId: string | undefined = undefined
  let currentCodeId: string | undefined = undefined
  let currentConstitutionId: string | undefined = undefined
  let currentLawId: string | undefined = undefined
  let currentSectionTaId: string | undefined = undefined
  let currentTextId: string | undefined = undefined

  async function* iterArticleLinks(
    article: TextAstArticle,
    text?: (TextAstText & TextAstPosition) | undefined,
    isSingleDeepDivisionOrArticle?: boolean | undefined,
  ): AsyncGenerator<ArticleLink, void> {
    if (article.relative === 0 && currentArticleId !== undefined) {
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
        `In "${context.input.slice(article.position.start, article.position.stop)}": Unknown article ${article.num ?? null} of text ${currentTextId} for reference ${JSON.stringify(article, null, 2)}`,
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
            `In "${context.input.slice(article.position.start, article.position.stop)}": Unable to filter article ${article.num ?? null} of text ${currentTextId ?? null} among IDs ${JSON.stringify(
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
        text === undefined || !isSingleDeepDivisionOrArticle
          ? article.position!
          : article.position!.start < text.position!.start
            ? { start: article.position.start, stop: text.position.stop }
            : { start: text.position.start, stop: article.position.stop }
      yield {
        article,
        articleId: currentArticleId,
        position,
        text,
        type: "article",
      }
    }
  }

  async function* iterDivisionLinks(
    division: TextAstDivision,
    divisionChildReference?: TextAstParentChild,
    parentLiensSectionTa?:
      | JorfTextelrLienSectionTa[]
      | JorfSectionTaLienSectionTa[]
      | LegiSectionTaLienSectionTa[]
      | LegiTextelrLienSectionTa[],
    text?: (TextAstText & TextAstPosition) | undefined,
    isSingleDeepDivisionOrArticle?: boolean | undefined,
  ): AsyncGenerator<ArticleLink | DivisionLink, void> {
    if (division.relative === 0 && currentSectionTaId !== undefined) {
      // "le même chapitre", "la présente section", etc
      // Do nothing.
      return
    }

    // Find division in given liensSectionTa.
    let divisionLienSectionTa:
      | JorfTextelrLienSectionTa
      | JorfSectionTaLienSectionTa
      | LegiSectionTaLienSectionTa
      | LegiTextelrLienSectionTa
      | undefined = undefined
    if (parentLiensSectionTa !== undefined) {
      for (const parentLienSectionTa of parentLiensSectionTa) {
        if (
          parentLienSectionTa["@debut"] > date ||
          parentLienSectionTa["@fin"] < date
        ) {
          continue
        }
        const divisionTypeAndnumber = parentLienSectionTa["#text"]
          ?.split(":")[0]
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .map((fragment: string) => fragment.trim())
          .filter((fragment: string) => fragment !== "") as
          | [string, string]
          | undefined
        if (divisionTypeAndnumber !== undefined) {
          let found = false
          if (division.index !== undefined) {
            found =
              (division.type === divisionTypeAndnumber[1] &&
                [...iterOrdinalNumeralFormsFromNumber(division.index)]
                  .map((ordinal) => ordinal.toLowerCase())
                  .includes(divisionTypeAndnumber[0])) ||
              (division.type === divisionTypeAndnumber[0] &&
                [...iterCardinalNumeralFormsFromNumber(division.index)]
                  .map((cardinal) => cardinal.toLowerCase())
                  .includes(divisionTypeAndnumber[1]))
          }
          if (!found && division.num !== undefined) {
            found =
              division.num.toLowerCase() === divisionTypeAndnumber.join(" ")
          }

          if (found) {
            divisionLienSectionTa = parentLienSectionTa
            break
          }
        }
      }
    }

    const divisionDeepestDivisionsOrArticles =
      divisionChildReference === undefined
        ? []
        : [...iterDeepestDivisionsOrArticles(divisionChildReference.child)]
    const divisionSingleDeepDivisionOrArticle =
      divisionDeepestDivisionsOrArticles.length === 1
        ? divisionDeepestDivisionsOrArticles[0]
        : undefined
    let addedLinksCount = 0
    if (divisionChildReference !== undefined) {
      for (const atomicOrParentChildReference of iterAtomicOrParentChildReferences(
        divisionChildReference.child,
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
          case "item":
          case "alinéa":
          case "phrase": {
            // Ignore sub-article & incomplete-header references.
            break
          }

          case "article": {
            yield* iterArticleLinks(
              atomicReference,
              text,
              atomicReference === divisionSingleDeepDivisionOrArticle,
            )
            addedLinksCount++
            break
          }

          case "chapitre":
          case "livre":
          case "paragraphe":
          case "partie":
          case "sous-paragraphe":
          case "section":
          case "sous-section":
          case "sous-sous-paragraphe":
          case "sous-titre":
          case "titre": {
            let divisionSectionTa: JorfSectionTa | LegiSectionTa | undefined =
              undefined
            let subdivisionsLiensSectionTa:
              | JorfTextelrLienSectionTa[]
              | LegiTextelrLienSectionTa[]
              | undefined = undefined
            if (divisionLienSectionTa !== undefined) {
              divisionSectionTa = (
                await db<{ data: JorfSectionTa | LegiSectionTa }[]>`
                  SELECT data
                  FROM section_ta
                  WHERE id = ${divisionLienSectionTa["@id"]}
                `
              )[0]?.data
              if (divisionSectionTa !== undefined) {
                subdivisionsLiensSectionTa =
                  divisionSectionTa.STRUCTURE_TA?.LIEN_SECTION_TA
              }
            }

            yield* iterDivisionLinks(
              atomicReference,
              parentChildReference,
              subdivisionsLiensSectionTa,
              text,
              atomicReference === divisionSingleDeepDivisionOrArticle,
            )
            addedLinksCount++
            break
          }

          default:
            if (logIgnoredReferencesTypes) {
              console.log(
                `In "${context.input.slice(divisionChildReference.position.start, divisionChildReference.position.stop)}": Reference of type ${atomicReference.type} ignored in division`,
              )
              console.log(JSON.stringify(divisionChildReference, null, 2))
            }
        }
      }
    }
    if (addedLinksCount === 0) {
      currentSectionTaId = divisionLienSectionTa?.["@id"]
      if (currentSectionTaId !== undefined) {
        const position =
          text === undefined || !isSingleDeepDivisionOrArticle
            ? division.position!
            : division.position!.start < text.position!.start
              ? { start: division.position.start, stop: text.position.stop }
              : { start: text.position.start, stop: division.position.stop }
        assert.notStrictEqual(position, undefined)
        yield {
          division,
          position,
          sectionTaId: currentSectionTaId,
          text,
          type: "division",
        }
      }
    }
  }

  for (const reference of iterReferences(context)) {
    if (logReferences) {
      console.log(
        `In "${context.input.slice(reference.position.start, reference.position.stop)}": \nReference "${context.text(reference.position)}": ${JSON.stringify(reference, null, 2)}`,
      )
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
        case "item":
        case "alinéa":
        case "phrase": {
          // Ignore sub-article & incomplete-header references.
          break
        }

        case "article": {
          yield* iterArticleLinks(atomicReference)
          break
        }

        case "chapitre":
        case "livre":
        case "paragraphe":
        case "partie":
        case "sous-paragraphe":
        case "section":
        case "sous-section":
        case "sous-sous-paragraphe":
        case "sous-titre":
        case "titre": {
          yield* iterDivisionLinks(atomicReference, parentChildReference)
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
                atomicReference.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentCodeId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
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
                atomicReference.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentConstitutionId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
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
                atomicReference.relative === 0 &&
                currentCodeId !== undefined
              ) {
                currentTextId = currentLawId
                break
              }

              if (atomicReference.cid === undefined) {
                if (logPartialReferences) {
                  console.log(
                    `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${atomicReference.nature} reference ${JSON.stringify(atomicReference, null, 2)}`,
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

          const textDeepestDivisionsOrArticles =
            parentChildReference === undefined
              ? []
              : [...iterDeepestDivisionsOrArticles(parentChildReference.child)]
          const textSingleDeepDivisionOrArticle =
            textDeepestDivisionsOrArticles.length === 1
              ? textDeepestDivisionsOrArticles[0]
              : undefined
          let addedLinksCount = 0
          if (parentChildReference !== undefined) {
            for (const atomicOrParentChildReferenceInText of iterAtomicOrParentChildReferences(
              parentChildReference.child,
            )) {
              const atomicReferenceInText =
                atomicOrParentChildReferenceInText.type === "parent-enfant"
                  ? atomicOrParentChildReferenceInText.parent
                  : atomicOrParentChildReferenceInText
              const parentChildReferenceInText =
                atomicOrParentChildReferenceInText.type === "parent-enfant"
                  ? atomicOrParentChildReferenceInText
                  : undefined
              assert.notStrictEqual(atomicReferenceInText.type, "parent-enfant")
              assert.notStrictEqual(
                atomicReferenceInText.type,
                "reference_et_action",
              )
              switch (atomicReferenceInText.type) {
                case "incomplete-header":
                case "item":
                case "alinéa":
                case "phrase": {
                  // Ignore sub-article & incomplete-header references.
                  break
                }

                case "article": {
                  yield* iterArticleLinks(
                    atomicReferenceInText,
                    atomicReference, // text
                    atomicReferenceInText === textSingleDeepDivisionOrArticle,
                  )
                  addedLinksCount++
                  break
                }

                case "chapitre":
                case "livre":
                case "paragraphe":
                case "sous-paragraphe":
                case "section":
                case "sous-section":
                case "sous-sous-paragraphe":
                case "sous-titre":
                case "titre": {
                  let textelr: JorfTextelr | LegiTextelr | undefined = undefined
                  let liensSectionTa:
                    | JorfTextelrLienSectionTa[]
                    | LegiTextelrLienSectionTa[]
                    | undefined = undefined
                  if (currentTextId !== undefined) {
                    textelr = (
                      await db<{ data: JorfTextelr | LegiTextelr }[]>`
                      SELECT data
                      FROM textelr
                      WHERE id = ${currentTextId}
                    `
                    )[0]?.data
                    if (textelr !== undefined) {
                      liensSectionTa = textelr.STRUCT?.LIEN_SECTION_TA
                    }
                  }
                  yield* iterDivisionLinks(
                    atomicReferenceInText,
                    parentChildReferenceInText,
                    liensSectionTa,
                    atomicReference, // text
                    atomicReferenceInText === textSingleDeepDivisionOrArticle,
                  )
                  addedLinksCount++
                  break
                }

                default:
                  if (logIgnoredReferencesTypes) {
                    console.log(
                      `In "${context.input.slice(reference.position.start, parentChildReference.position.stop)}": Reference of type ${atomicReferenceInText.type} ignored in text`,
                    )
                    console.log(JSON.stringify(parentChildReference, null, 2))
                  }
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
              `In "${context.input.slice(reference.position.start, reference.position.stop)}": Reference ${JSON.stringify(atomicReference, null, 2)} ignored`,
            )
            console.log(JSON.stringify(reference, null, 2))
          }
      }
    }
  }
}
