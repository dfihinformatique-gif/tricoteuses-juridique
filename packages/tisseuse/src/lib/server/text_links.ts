import type {
  JorfArticle,
  JorfSectionTa,
  JorfSectionTaLienSectionTa,
  JorfTextelr,
  JorfTextelrLienSectionTa,
  LegiArticle,
  LegiSectionTa,
  LegiSectionTaLienSectionTa,
  LegiTextelr,
  LegiTextelrLienSectionTa,
} from "@tricoteuses/legifrance"
import assert from "node:assert"

import { assertNever } from "$lib/asserts.js"
import {
  iterCardinalNumeralFormsFromNumber,
  iterLatinMultiplicativeAdverbsFromNumber,
  iterOrdinalNumeralFormsFromNumber,
} from "$lib/numbers.js"
import { legiDb } from "$lib/server/databases/index.js"
import {
  divisionTypes,
  isTextAstDivision,
  isTextAstPortion,
  type DivisionType,
  type TextAstArticle,
  type TextAstAtomicReference,
  type TextAstDivision,
  type TextAstParentChild,
  type TextAstPosition,
  type TextAstReference,
  type TextAstText,
} from "$lib/text_parsers/ast.js"
import {
  iterCitationReferences,
  iterReferences,
} from "$lib/text_parsers/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import type { TextPosition } from "$lib/text_parsers/positions.js"

export type DefinitionOrLink =
  | ArticleDefinition
  | ArticleLink
  // | DivisionDefinition
  | DivisionLink
  | TextLink

export interface ArticleDefinition {
  article: TextAstArticle
  /**
   * Same value as article.position, added for homogeneity
   */
  position: TextPosition
  textId: string
  type: "article_definition"
}

export interface ArticleExternalLink {
  article: TextAstArticle
  articleId: string
  position: TextPosition
  type: "external_article"
}

export interface ArticleInternalLink {
  article: TextAstArticle
  definition: ArticleDefinition
  position: TextPosition
  type: "internal_article"
}

export type ArticleLink = ArticleExternalLink | ArticleInternalLink

// export interface DivisionDefinition {
//   division: TextAstDivision
// /**
//  * Same value as division.position, added for homogeneity
//  */
// position: TextPosition
//   textId: string
//   type: "division_definition"
// }

export interface DivisionExternalLink {
  division: TextAstDivision
  position: TextPosition
  sectionTaId: string
  type: "external_division"
}

// export interface DivisionInternalLink {
//   division: TextAstDivision
//   definition: DivisionDefinition
//   position: TextPosition
//   type: "internal_division"
// }

export type DivisionLink = DivisionExternalLink // | DivisionInternalLink

export interface TextExternalLink {
  position: TextPosition
  text: TextAstText & TextAstPosition
  type: "external_text"
}

export type TextLink = TextExternalLink // No internal link yet

function* iterAtomicOrParentChildReferences(
  context: TextParserContext,
  reference: TextAstReference,
): Generator<TextAstAtomicReference | TextAstParentChild, void> {
  switch (reference.type) {
    case "bounded-interval": {
      yield* iterAtomicOrParentChildReferences(context, reference.first)
      yield* iterAtomicOrParentChildReferences(context, reference.last)
      break
    }

    case "counted-interval": {
      yield* iterAtomicOrParentChildReferences(context, reference.first)
      break
    }

    case "enumeration":
    case "exclusion": {
      yield* iterAtomicOrParentChildReferences(context, reference.left)
      yield* iterAtomicOrParentChildReferences(context, reference.right)
      break
    }

    case "reference_et_action": {
      yield* iterAtomicOrParentChildReferences(context, reference.reference)
      const { originalCitations } = reference.action
      if (originalCitations !== undefined) {
        for (const citation of originalCitations) {
          for (const citationReference of iterCitationReferences(
            context,
            citation,
          )) {
            yield* iterAtomicOrParentChildReferences(context, citationReference)
          }
        }
      }
      break
    }

    default: {
      yield reference
    }
  }
}

function* iterDeepestDivisionsOrArticles(
  context: TextParserContext,
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
        yield* iterDeepestDivisionsOrArticles(context, reference.first)
        yield* iterDeepestDivisionsOrArticles(context, reference.last)
        break
      }

      case "counted-interval": {
        yield* iterDeepestDivisionsOrArticles(context, reference.first)
        break
      }

      case "enumeration":
      case "exclusion": {
        yield* iterDeepestDivisionsOrArticles(context, reference.left)
        yield* iterDeepestDivisionsOrArticles(context, reference.right)
        break
      }

      case "parent-enfant": {
        const childDeepestDivisionsOrArticles = [
          ...iterDeepestDivisionsOrArticles(context, reference.child),
        ]
        if (childDeepestDivisionsOrArticles.length === 0) {
          yield* iterDeepestDivisionsOrArticles(context, reference.parent)
        } else {
          yield* childDeepestDivisionsOrArticles
        }
        break
      }

      case "reference_et_action": {
        yield* iterDeepestDivisionsOrArticles(context, reference.reference)
        const { originalCitations } = reference.action
        if (originalCitations !== undefined) {
          for (const citation of originalCitations) {
            for (const citationReference of iterCitationReferences(
              context,
              citation,
            )) {
              yield* iterDeepestDivisionsOrArticles(context, citationReference)
            }
          }
        }
        break
      }

      default: {
        assertNever("iterDeepestDivisionsOrArticles reference.type", reference)
      }
    }
  }
}

function* iterDivisionTypesAndNumbers(
  divisionType: string,
  index: number,
): Generator<string, void> {
  const index0 = Math.floor(index)
  const index1 = Math.floor((index - index0) * 1000)
  if (index1 === 0) {
    for (const ordinal of iterOrdinalNumeralFormsFromNumber(index0)) {
      yield `${ordinal.toLowerCase()} ${divisionType}`
    }
    for (const cardinal of iterCardinalNumeralFormsFromNumber(index0)) {
      yield `${divisionType} ${cardinal.toLowerCase()}`
    }
  } else {
    for (const latinMultiplicativeAdverb of iterLatinMultiplicativeAdverbsFromNumber(
      index1,
    )) {
      for (const ordinal of iterOrdinalNumeralFormsFromNumber(index0)) {
        yield `${ordinal.toLowerCase()} ${latinMultiplicativeAdverb} ${divisionType}`
      }
      for (const cardinal of iterCardinalNumeralFormsFromNumber(index0)) {
        yield `${divisionType} ${latinMultiplicativeAdverb} ${cardinal.toLowerCase()}`
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
): AsyncGenerator<DefinitionOrLink, void> {
  assert.notStrictEqual(date, undefined, "Date option is required")

  const articleDefinitionByNumByTextId: Record<
    string,
    Record<string, ArticleDefinition>
  > = {}
  let currentArticleId: string | undefined = undefined
  let currentCodeId: string | undefined = undefined
  let currentConstitutionId: string | undefined = undefined
  let currentDecreeId: string | undefined = undefined
  let currentLawId: string | undefined = undefined
  let currentSectionTaId: string | undefined = undefined
  let currentTextId: string | undefined = undefined

  /**
   * iterArticleLinks
   */
  async function* iterArticleLinks(
    article: TextAstArticle,
    /**
     * Defined only when article is the unique descendant of a text and optionally its divisions.
     */
    ancestors:
      | Array<TextAstDivision | (TextAstText & TextAstPosition)>
      | undefined = undefined,
  ): AsyncGenerator<ArticleLink, void> {
    if (article.relative === 0 && currentArticleId !== undefined) {
      // "le même article", "le présent article", etc
      // Do nothing.
      return
    }

    if (currentTextId !== undefined && article.num !== undefined) {
      const articleDefinition =
        articleDefinitionByNumByTextId[currentTextId]?.[article.num]
      if (articleDefinition !== undefined) {
        const position =
          ancestors === undefined
            ? article.position!
            : article.position!.start < ancestors[0].position!.start
              ? {
                  start: article.position.start,
                  stop: ancestors[0].position.stop,
                }
              : {
                  start: ancestors[0].position.start,
                  stop: article.position.stop,
                }

        yield {
          article,
          definition: articleDefinition,
          position,
          type: "internal_article",
        }
        return
      }
    }

    let articlesInfos: Array<{
      data: JorfArticle | LegiArticle
      id: string
    }> = []
    if (currentTextId !== undefined) {
      articlesInfos = [
        ...(await legiDb<
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
        ...(await legiDb<
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
        ...(await legiDb<
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
        ancestors === undefined
          ? article.position!
          : article.position!.start < ancestors[0].position!.start
            ? {
                start: article.position.start,
                stop: ancestors[0].position.stop,
              }
            : {
                start: ancestors[0].position.start,
                stop: article.position.stop,
              }
      yield {
        article,
        articleId: currentArticleId,
        position,
        type: "external_article",
      }
    }
  }

  /**
   * iterDivisionLinks
   */
  async function* iterDivisionLinks(
    division: TextAstDivision,
    divisionChildReference?: TextAstParentChild,
    parentLiensSectionTa?:
      | JorfTextelrLienSectionTa[]
      | JorfSectionTaLienSectionTa[]
      | LegiSectionTaLienSectionTa[]
      | LegiTextelrLienSectionTa[],
    /**
     * Defined only when division is the unique descendant of a text and optionally its parent
     * divisions.
     */
    ancestors:
      | Array<TextAstDivision | (TextAstText & TextAstPosition)>
      | undefined = undefined,
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
    if (parentLiensSectionTa === undefined && currentTextId !== undefined) {
      const textelr = (
        await legiDb<{ data: JorfTextelr | LegiTextelr }[]>`
          SELECT data
          FROM textelr
          WHERE id = ${currentTextId}
        `
      )[0]?.data
      if (textelr !== undefined) {
        parentLiensSectionTa = textelr.STRUCT?.LIEN_SECTION_TA
      }
    }
    if (parentLiensSectionTa !== undefined) {
      for (const parentLienSectionTa of parentLiensSectionTa) {
        if (
          parentLienSectionTa["@debut"] > date ||
          parentLienSectionTa["@fin"] < date
        ) {
          continue
        }
        const sectionTaTypeAndNumber = parentLienSectionTa["#text"]
          ?.split(":")[0]
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .map((fragment: string) => fragment.trim())
          .filter((fragment: string) => fragment !== "")
          .join(" ")
        if (sectionTaTypeAndNumber !== undefined) {
          let found = false
          if (division.index !== undefined) {
            found = iterDivisionTypesAndNumbers(
              division.type,
              division.index,
            ).some(
              (divisionTypeAndNumber) =>
                divisionTypeAndNumber === sectionTaTypeAndNumber,
            )
          }
          if (!found && division.num !== undefined) {
            found =
              `${division.type} ${division.num.toLowerCase()}` ===
              sectionTaTypeAndNumber
          }

          if (found) {
            divisionLienSectionTa = parentLienSectionTa
            break
          }
        }
      }
      if (divisionLienSectionTa === undefined) {
        // Division not found.
        // If parentLiensSectionTa contains a "Partie législative" sectionTa, use it
        // as division, because in legislative texts, the "Partie législative" is often
        // implicit in references.
        // For example:
        // "Le livre III du code des impositions sur les biens et services"
        // instead of:
        // "Le livre III de la partie législative du code des impositions sur les biens et services"
        divisionLienSectionTa = parentLiensSectionTa
          .filter(
            (parentLienSectionTa) =>
              parentLienSectionTa["@debut"] <= date &&
              parentLienSectionTa["@fin"] >= date,
          )
          .find((parentLienSectionTa) => {
            const sectionTaNameSplit = parentLienSectionTa["#text"]
              ?.split(":")[0]
              .trim()
              .toLowerCase()
              .split(/\s+/)
              .map((fragment: string) => fragment.trim())
              .filter((fragment: string) => fragment !== "")
            return (
              sectionTaNameSplit !== undefined &&
              sectionTaNameSplit.length === 2 &&
              divisionTypes.includes(sectionTaNameSplit[0] as DivisionType) &&
              sectionTaNameSplit[1] === "législative"
            )
          })
        if (divisionLienSectionTa !== undefined) {
          // Create an invisible division containing the "Partie législative".
          const sectionTaNameSplit = divisionLienSectionTa["#text"]!.split(
            ":",
          )[0]
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map((fragment: string) => fragment.trim())
            .filter((fragment: string) => fragment !== "")
          const insertedDivision: TextAstDivision = {
            num: sectionTaNameSplit[1],
            position: {
              // Position start - stop = 0 ⇒ invisible
              start: division.position.stop,
              stop: division.position.stop,
            },
            type: sectionTaNameSplit[0] as DivisionType,
          }
          divisionChildReference = {
            child: divisionChildReference ?? division,
            parent: insertedDivision,
            position: {
              // Position start - stop = 0 ⇒ invisible
              start: division.position.stop,
              stop: division.position.stop,
            },
            type: "parent-enfant",
          }
          division = insertedDivision
        }
      }
    }

    const divisionDeepestDivisionsOrArticles =
      divisionChildReference === undefined
        ? []
        : [
            ...iterDeepestDivisionsOrArticles(
              context,
              divisionChildReference.child,
            ),
          ]
    let addedLinksCount = 0
    if (divisionChildReference !== undefined) {
      for (const atomicOrParentChildReference of iterAtomicOrParentChildReferences(
        context,
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
          case "alinéa":
          case "incomplete-header":
          case "item":
          case "phrase": {
            // Ignore sub-article & incomplete-header references.
            break
          }

          case "article": {
            yield* iterArticleLinks(
              atomicReference,
              divisionDeepestDivisionsOrArticles.length === 1
                ? [...(ancestors ?? []), division]
                : undefined,
            )
            addedLinksCount++
            break
          }

          case "chapitre":
          case "livre":
          case "paragraphe":
          case "partie":
          case "section":
          case "sous-paragraphe":
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
                await legiDb<{ data: JorfSectionTa | LegiSectionTa }[]>`
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
              divisionDeepestDivisionsOrArticles.length === 1
                ? [...(ancestors ?? []), division]
                : undefined,
            )
            addedLinksCount++
            break
          }

          default: {
            if (logIgnoredReferencesTypes) {
              console.log(
                `In "${context.input.slice(divisionChildReference.position.start, divisionChildReference.position.stop)}": Reference of type ${atomicReference.type} ignored in division`,
              )
              console.log(JSON.stringify(divisionChildReference, null, 2))
            }
          }
        }
      }
    }
    if (addedLinksCount === 0) {
      currentSectionTaId = divisionLienSectionTa?.["@id"]
      if (currentSectionTaId !== undefined) {
        const position =
          ancestors === undefined
            ? division.position!
            : division.position!.start < ancestors[0].position!.start
              ? {
                  start: division.position.start,
                  stop: ancestors[0].position.stop,
                }
              : {
                  start: ancestors[0].position.start,
                  stop: division.position.stop,
                }
        assert.notStrictEqual(position, undefined)
        yield {
          division,
          position,
          sectionTaId: currentSectionTaId,
          type: "external_division",
        }
      }
    }
  }

  /**
   * updateCurrentTextId
   */
  function updateCurrentTextId(
    reference: TextAstReference,
    text: TextAstText,
  ): void {
    switch (text.nature) {
      case "ARRETE":
      case "CIRCULAIRE":
      case "CONVENTION":
      case "DECRET_LOI":
      case "DIRECTIVE_EURO":
      case "REGLEMENTEUROPEEN": {
        // TODO
        currentTextId = undefined
        break
      }

      case "CODE": {
        if (text.relative === 0 && currentCodeId !== undefined) {
          currentTextId = currentCodeId
          break
        }

        if (text.cid === undefined) {
          if (logPartialReferences) {
            console.log(
              `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
            )
          }
          currentTextId = undefined
          break
        }

        currentTextId = currentCodeId = text.cid
        break
      }

      case "CONSTITUTION": {
        if (text.relative === 0 && currentConstitutionId !== undefined) {
          currentTextId = currentConstitutionId
          break
        }

        if (text.cid === undefined) {
          if (logPartialReferences) {
            console.log(
              `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
            )
          }
          currentTextId = undefined
          break
        }

        currentTextId = currentConstitutionId = text.cid
        break
      }

      case "DECRET": {
        if (text.relative === 0 && currentDecreeId !== undefined) {
          currentTextId = currentDecreeId
          break
        }

        if (text.cid === undefined) {
          if (logPartialReferences) {
            console.log(
              `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
            )
          }
          currentTextId = undefined
          break
        }

        currentTextId = currentDecreeId = text.cid
        break
      }

      case "LOI":
      case "LOI_CONSTIT":
      case "LOI_ORGANIQUE":
      case "ORDONNANCE": {
        if (text.relative === 0 && currentLawId !== undefined) {
          currentTextId = currentLawId
          break
        }

        if (text.cid === undefined) {
          if (logPartialReferences) {
            console.log(
              `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
            )
          }
          currentTextId = undefined
          break
        }

        currentTextId = currentLawId = text.cid
        break
      }

      default: {
        assertNever("nature", text.nature)
      }
    }
  }

  //
  // FIRST STEP: Store declarations of divisions & articles.
  //
  // A two steps process is needed, because in a bill an article definition
  // may occur after references to it.
  //

  const references: TextAstReference[] = []
  for (const reference of iterReferences(context)) {
    if (logReferences) {
      console.log(
        `In "${context.input.slice(reference.position.start, reference.position.stop)}": \nReference "${context.text(reference.position)}": ${JSON.stringify(reference, null, 2)}`,
      )
    }
    references.push(reference)
    for (const atomicOrParentChildReference of iterAtomicOrParentChildReferences(
      context,
      reference,
    )) {
      const atomicReference =
        atomicOrParentChildReference.type === "parent-enfant"
          ? atomicOrParentChildReference.parent
          : atomicOrParentChildReference
      assert.notStrictEqual(atomicReference.type, "parent-enfant")
      assert.notStrictEqual(atomicReference.type, "reference_et_action")
      switch (atomicReference.type) {
        case "alinéa":
        case "incomplete-header":
        case "item":
        case "phrase": {
          // Ignore sub-article & incomplete-header references.
          break
        }

        case "article": {
          if (atomicReference.definition) {
            if (currentTextId === undefined) {
              if (logPartialReferences) {
                console.log(
                  `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing currentTextId for article definition`,
                )
              }
            } else {
              ;(articleDefinitionByNumByTextId[currentTextId] ??= {})[
                atomicReference.num!
              ] = {
                article: atomicReference,
                position: atomicReference.position,
                textId: currentTextId,
                type: "article_definition",
              }
            }
          }
          break
        }

        case "chapitre":
        case "livre":
        case "paragraphe":
        case "partie":
        case "section":
        case "sous-paragraphe":
        case "sous-section":
        case "sous-sous-paragraphe":
        case "sous-titre":
        case "titre": {
          if (atomicReference.definition) {
            if (currentTextId === undefined) {
              if (logPartialReferences) {
                console.log(
                  `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing currentTextId for division definition`,
                )
              }
            } else {
              // TODO: Needs to use a sequenece of nums instead and each of the num cas have differenet syntaxes!
              // ;(divisionDefinitionByNumByTextId[currentTextId] ??= {})[
              //   atomicReference.num!
              // ] = {
              //   division: atomicReference,
              //   textId: currentTextId,
              //   type: "division_definition",
              // }
            }
          }
          break
        }

        case "texte": {
          updateCurrentTextId(reference, atomicReference)
          break
        }

        default: {
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

  //
  // SECOND STEP: Create links.
  //

  currentArticleId = undefined
  currentCodeId = undefined
  currentConstitutionId = undefined
  currentDecreeId = undefined
  currentLawId = undefined
  currentSectionTaId = undefined
  currentTextId = undefined
  for (const reference of references) {
    for (const atomicOrParentChildReference of iterAtomicOrParentChildReferences(
      context,
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
        case "alinéa":
        case "incomplete-header":
        case "item":
        case "phrase": {
          // Ignore sub-article & incomplete-header references.
          break
        }

        case "article": {
          if (atomicReference.definition && currentTextId !== undefined) {
            const articleDefinition =
              articleDefinitionByNumByTextId[currentTextId]?.[
                atomicReference.num!
              ]
            if (articleDefinition !== undefined) {
              yield articleDefinition
            }
          } else {
            yield* iterArticleLinks(atomicReference)
          }
          break
        }

        case "chapitre":
        case "livre":
        case "paragraphe":
        case "partie":
        case "section":
        case "sous-paragraphe":
        case "sous-section":
        case "sous-sous-paragraphe":
        case "sous-titre":
        case "titre": {
          if (atomicReference.definition && currentTextId !== undefined) {
            // TODO
            // const divisionDefinition =
            //   divisionDefinitionByNumByTextId[currentTextId]?.[
            //     atomicReference.num!
            //   ]
            // if (divisionDefinition !== undefined) {
            //   yield divisionDefinition
            // }
          } else {
            yield* iterDivisionLinks(atomicReference, parentChildReference)
          }
          break
        }

        case "texte": {
          updateCurrentTextId(reference, atomicReference)

          const textDeepestDivisionsOrArticles =
            parentChildReference === undefined
              ? []
              : [
                  ...iterDeepestDivisionsOrArticles(
                    context,
                    parentChildReference.child,
                  ),
                ]
          let addedLinksCount = 0
          if (parentChildReference !== undefined) {
            for (const atomicOrParentChildReferenceInText of iterAtomicOrParentChildReferences(
              context,
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
                case "alinéa":
                case "incomplete-header":
                case "item":
                case "phrase": {
                  // Ignore sub-article & incomplete-header references.
                  break
                }

                case "article": {
                  yield* iterArticleLinks(
                    atomicReferenceInText,
                    textDeepestDivisionsOrArticles.length === 1
                      ? [atomicReference] // text
                      : undefined,
                  )
                  addedLinksCount++
                  break
                }

                case "chapitre":
                case "livre":
                case "paragraphe":
                case "partie":
                case "section":
                case "sous-paragraphe":
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
                      await legiDb<{ data: JorfTextelr | LegiTextelr }[]>`
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
                    textDeepestDivisionsOrArticles.length === 1
                      ? [atomicReference] // text
                      : undefined,
                  )
                  addedLinksCount++
                  break
                }

                default: {
                  if (logIgnoredReferencesTypes) {
                    console.log(
                      `In "${context.input.slice(reference.position.start, parentChildReference.position.stop)}": Reference of type ${atomicReferenceInText.type} ignored in text`,
                    )
                    console.log(JSON.stringify(parentChildReference, null, 2))
                  }
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
              type: "external_text",
            }
          }
          break
        }

        default: {
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
}
