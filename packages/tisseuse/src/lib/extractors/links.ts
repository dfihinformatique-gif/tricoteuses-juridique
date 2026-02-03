import {
  iterCardinalNumeralFormsFromNumber,
  iterLatinMultiplicativeAdverbsFromNumber,
  iterOrdinalNumeralFormsFromNumber,
  type JorfArticle,
  type JorfSectionTa,
  type JorfSectionTaLienSectionTa,
  type JorfTextelr,
  type JorfTextelrLienSectionTa,
  type LegiArticle,
  type LegiSectionTa,
  type LegiSectionTaLienSectionTa,
  type LegiTextelr,
  type LegiTextelrLienSectionTa,
} from "@tricoteuses/legifrance"
import type { Sql } from "postgres"

import { assertNever } from "$lib/asserts.js"
import {
  extractReferences,
  extractReferencesWithOriginalTransformations,
} from "$lib/extractors/references.js"

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
  FragmentPosition,
  FragmentReverseTransformation,
} from "$lib/text_parsers/fragments.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  newReverseTransformationsMergedFromPositionsIterator,
  reverseTransformationFromPosition,
  type Transformation,
} from "$lib/text_parsers/transformers.js"

export type DefinitionOrLink =
  | ArticleDefinition
  | ArticleLink
  // | DivisionDefinition
  | DivisionLink
  | TextLink

export interface ArticleDefinition {
  article: TextAstArticle
  /**
   * Same value as article.originalTransformation, added for homogeneity
   *
   * Only defined when a transformation was used to convert input text
   * to simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  /**
   * Same value as article.position, added for homogeneity
   */
  position: FragmentPosition
  reference: TextAstReference
  textId: string
  type: "article_definition"
}

export interface ArticleExternalLink {
  article: TextAstArticle
  articleId?: string
  /**
   * Only defined when a transformation was used to convert input text
   * to simpeurolified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  type: "external_article"
}

export interface ArticleInternalLink {
  article: TextAstArticle
  definition: ArticleDefinition
  /**
   * Only defined when a transformation was used to convert input text
   * to simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  type: "internal_article"
}

export type ArticleLink = ArticleExternalLink | ArticleInternalLink

// export interface DivisionDefinition {
//   division: TextAstDivision
//   /**
//    * Same value as division.position, added for homogeneity
//    */
//   position: FragmentPosition
//   reference: TextAstReference
//   textId: string
//   type: "division_definition"
// }

export interface DivisionExternalLink {
  division: TextAstDivision
  /**
   * Only defined when a transformation was used to convert input text
   * to simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  sectionTaId?: string
  type: "external_division"
}

// export interface DivisionInternalLink {
//   division: TextAstDivision
//   definition: DivisionDefinition
//   /**
//    * Only defined when a transformation was used to convert input text
//    * to simplified text.
//    */
//   originalTransformation?: FragmentReverseTransformation
//   position: FragmentPosition
//   reference: TextAstReference
//   type: "internal_division"
// }

export type DivisionLink = DivisionExternalLink // | DivisionInternalLink

export interface ExtractedLinkDb {
  field_name: string
  index: number
  link:
    | ArticleExternalLink
    | DivisionExternalLink
    | TextEuropeanLink
    | TextExternalLink
  source_id: string
  target_id: string | null
}

export interface TextEuropeanLink {
  /**
   * Only defined when a transformation was used to convert input text
   * to simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  text: TextAstText & TextAstPosition
  titleId: string
  type: "european_text"
  url?: string
}

export interface TextExternalLink {
  /**
   * Only defined when a transformation was used to convert input text
   * to simplified text.
   */
  originalTransformation?: FragmentReverseTransformation
  position: FragmentPosition
  reference: TextAstReference
  text: TextAstText & TextAstPosition
  type: "external_text"
}

export type TextLink = TextEuropeanLink | TextExternalLink // No internal link yet

export interface TextLinksParserState {
  articleId?: string
  codeId?: string
  constitutionId?: string
  decreeId?: string
  defaultTextId?: string
  lawId?: string
  sectionTaId?: string
  textId?: string
}

export async function* extractTextLinks({
  context,
  date,
  europeDb,
  legiDb,
  logIgnoredReferencesTypes,
  logPartialReferences,
  logReferences,
  state: inputState,
  transformation,
}: {
  context: TextParserContext
  date: string
  europeDb: Sql
  legiDb: Sql
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  logReferences?: boolean
  /**
   * When given, state is modified by this generator, so that the callers
   * always has the latest state version (and can reuse it for the next article,
   * for example).
   */
  state?: TextLinksParserState
  transformation?: Transformation
}): AsyncGenerator<DefinitionOrLink, void> {
  const articleDefinitionByNumByTextId: Record<
    string,
    Record<string, ArticleDefinition>
  > = {}
  const originalPositionsFromTransformedIterator =
    transformation === undefined
      ? undefined
      : newReverseTransformationsMergedFromPositionsIterator(transformation)

  let state = inputState === undefined ? {} : structuredClone(inputState)

  //
  // FIRST STEP: Store declarations of divisions & articles.
  //
  // A two steps process is needed, because in a bill an article definition
  // may occur after references to it.
  //

  const references: TextAstReference[] = []
  for (const reference of transformation === undefined
    ? extractReferences(context)
    : extractReferencesWithOriginalTransformations(context, transformation)) {
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
            if (state.textId === undefined) {
              if (logPartialReferences) {
                console.log(
                  `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing state.textId for article definition`,
                )
              }
            } else {
              ;(articleDefinitionByNumByTextId[state.textId] ??= {})[
                atomicReference.num!
              ] = Object.fromEntries(
                Object.entries({
                  article: atomicReference,
                  originalTransformation:
                    atomicReference.originalTransformation,
                  position: atomicReference.position,
                  reference,
                  textId: state.textId,
                  type: "article_definition",
                }).filter(([, value]) => value !== undefined),
              ) as unknown as ArticleDefinition
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
            if (state.textId === undefined) {
              if (logPartialReferences) {
                console.log(
                  `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing state.textId for division definition`,
                )
              }
            } else {
              // TODO: Needs to use a sequenece of nums instead and each of the num cas have differenet syntaxes!
              // ;(divisionDefinitionByNumByTextId[state.textId] ??= {})[
              //   atomicReference.num!
              // ] = {
              //   division: atomicReference,
              //   textId: state.textId,
              //   type: "division_definition",
              // }
            }
          }
          break
        }

        case "texte": {
          updateStateTextId({
            context,
            logPartialReferences,
            reference,
            state,
            text: atomicReference,
          })
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

  // Reset state
  state = inputState === undefined ? {} : inputState
  for (const reference of references) {
    yield* iterReferenceLinks({
      articleDefinitionByNumByTextId,
      context,
      date,
      europeDb,
      legiDb,
      logIgnoredReferencesTypes,
      logPartialReferences,
      originalPositionsFromTransformedIterator,
      reference,
      state,
    })
  }
}

/**
 * updateStateTextId
 */
function updateStateTextId({
  context,
  logPartialReferences,
  reference,
  state,
  text,
}: {
  context: TextParserContext
  logPartialReferences?: boolean
  reference: TextAstReference
  state: TextLinksParserState
  text: TextAstText
}): void {
  switch (text.nature) {
    case "ARRETE":
    case "CIRCULAIRE":
    case "CONVENTION":
    case "DECRET_LOI":
    case "DIRECTIVE_EURO":
    case "REGLEMENTEUROPEEN": {
      // TODO
      delete state.textId
      break
    }

    case "CODE": {
      if (text.relative === 0 && state.codeId !== undefined) {
        state.textId = state.codeId
        break
      }

      if (text.cid === undefined) {
        if (logPartialReferences) {
          console.log(
            `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
          )
        }
        delete state.textId
        break
      }

      state.textId = state.codeId = text.cid
      break
    }

    case "CONSTITUTION": {
      if (text.relative === 0 && state.constitutionId !== undefined) {
        state.textId = state.constitutionId
        break
      }

      if (text.cid === undefined) {
        if (logPartialReferences) {
          console.log(
            `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
          )
        }
        delete state.textId
        break
      }

      state.textId = state.constitutionId = text.cid
      break
    }

    case "DECRET": {
      if (text.relative === 0 && state.decreeId !== undefined) {
        state.textId = state.decreeId
        break
      }

      if (text.cid === undefined) {
        if (logPartialReferences) {
          console.log(
            `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
          )
        }
        delete state.textId
        break
      }

      state.textId = state.decreeId = text.cid
      break
    }

    case "LOI":
    case "LOI_CONSTIT":
    case "LOI_ORGANIQUE":
    case "ORDONNANCE": {
      if (text.relative === 0 && state.lawId !== undefined) {
        state.textId = state.lawId
        break
      }

      if (text.cid === undefined) {
        if (logPartialReferences) {
          console.log(
            `In "${context.input.slice(reference.position.start, reference.position.stop)}": Missing CID of ${text.nature} reference ${JSON.stringify(text, null, 2)}`,
          )
        }
        delete state.textId
        break
      }

      state.textId = state.lawId = text.cid
      break
    }

    default: {
      assertNever("nature", text.nature)
    }
  }
}

/**
 * iterArticleLinks
 */
async function* iterArticleLinks({
  ancestors,
  article,
  context,
  date,
  legiDb,
  originalPositionsFromTransformedIterator,
  reference,
  state,
}: {
  /**
   * Defined only when article is the unique descendant of a text and optionally its divisions.
   */
  ancestors?: Array<TextAstDivision | (TextAstText & TextAstPosition)>
  article: TextAstArticle
  context: TextParserContext
  date: string
  legiDb: Sql
  originalPositionsFromTransformedIterator?: Generator<
    FragmentReverseTransformation,
    void,
    FragmentPosition | undefined
  >
  reference: TextAstReference
  state: TextLinksParserState
}): AsyncGenerator<ArticleLink, void> {
  if (article.present) {
    // Ignore "le présent article", etc
    return
  }

  // if (state.textId !== undefined && article.num !== undefined) {
  //   const articleDefinition =
  //     articleDefinitionByNumByTextId[state.textId]?.[article.num]
  //   if (articleDefinition !== undefined) {
  //     const position =
  //       ancestors === undefined
  //         ? article.position!
  //         : article.position!.start < ancestors[0].position!.start
  //           ? {
  //               start: article.position.start,
  //               stop: ancestors[0].position.stop,
  //             }
  //           : {
  //               start: ancestors[0].position.start,
  //               stop: article.position.stop,
  //             }
  //     yield Object.fromEntries(
  //       Object.entries({
  //         article,
  //         definition: articleDefinition,
  //         originalTransformation:
  //           originalPositionsFromTransformedIterator === undefined
  //             ? undefined
  //             : reverseTransformationFromPosition(
  //                 originalPositionsFromTransformedIterator,
  //                 position,
  //               ),
  //         position,
  //         reference,
  //         type: "internal_article",
  //       }).filter(([, value]) => value !== undefined),
  //     ) as unknown as ArticleLink
  //     return
  //   }
  // }

  let articlesInfos: Array<{
    data: JorfArticle | LegiArticle
    id: string
  }> = []
  if (state.textId !== undefined) {
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
            data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${state.textId}
            AND num = ${article.num ?? null}
        `),
    ]
  }
  if (
    articlesInfos.length === 0 &&
    state.defaultTextId !== undefined &&
    state.defaultTextId !== state.textId
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
            data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${state.defaultTextId}
            AND num = ${article.num ?? null}
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
            num = ${article.num}
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
      `In "${context.input.slice(article.position.start, article.position.stop)}": Unknown article ${article.num ?? null} of text ${state.textId} for reference ${JSON.stringify(article, null, 2)}`,
    )
    delete state.articleId
  } else if (articlesInfos.length === 1) {
    state.articleId = articlesInfos[0].id
  } else {
    let filteredArticlesInfos = articlesInfos.filter(({ data }) => {
      const metaArticle = data.META.META_SPEC.META_ARTICLE
      return metaArticle.DATE_DEBUT <= date && metaArticle.DATE_FIN > date
    })
    if (filteredArticlesInfos.length === 1) {
      state.articleId = filteredArticlesInfos[0].id
    } else {
      if (filteredArticlesInfos.length !== 0) {
        articlesInfos = filteredArticlesInfos
      }
      filteredArticlesInfos = articlesInfos.filter(
        ({ id }) => !state.textId?.startsWith("JORF") || id.startsWith("JORF"),
      )
      if (filteredArticlesInfos.length === 1) {
        state.articleId = filteredArticlesInfos[0].id
      } else {
        if (filteredArticlesInfos.length !== 0) {
          articlesInfos = filteredArticlesInfos
        }
        console.warn(
          `In "${context.input.slice(article.position.start, article.position.stop)}": Unable to filter article ${article.num ?? null} of text ${state.textId ?? null} among IDs ${JSON.stringify(
            articlesInfos.map(({ id }) => id),
            null,
            2,
          )} for reference ${JSON.stringify(article, null, 2)}`,
        )
        delete state.articleId
      }
    }
  }

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
  yield Object.fromEntries(
    Object.entries({
      article,
      articleId: state.articleId,
      originalTransformation:
        originalPositionsFromTransformedIterator === undefined
          ? undefined
          : reverseTransformationFromPosition(
              originalPositionsFromTransformedIterator,
              position,
            ),
      position,
      reference,
      type: "external_article",
    }).filter(([, value]) => value !== undefined),
  ) as unknown as ArticleLink
}

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
          if (citation.references !== undefined) {
            for (const citationReference of citation.references) {
              yield* iterAtomicOrParentChildReferences(
                context,
                citationReference,
              )
            }
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
    console.error(
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
            if (citation.references !== undefined) {
              for (const citationReference of citation.references) {
                yield* iterDeepestDivisionsOrArticles(
                  context,
                  citationReference,
                )
              }
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

/**
 * iterDivisionLinks
 */
async function* iterDivisionLinks({
  ancestors,
  context,
  date,
  division,
  divisionChildReference,
  legiDb,
  logIgnoredReferencesTypes,
  originalPositionsFromTransformedIterator,
  parentLiensSectionTa,
  reference,
  state,
}: {
  /**
   * Defined only when division is the unique descendant of a text and optionally its parent
   * divisions.
   */
  ancestors?: Array<TextAstDivision | (TextAstText & TextAstPosition)>
  context: TextParserContext
  date: string
  division: TextAstDivision
  divisionChildReference?: TextAstParentChild
  legiDb: Sql
  logIgnoredReferencesTypes?: boolean
  originalPositionsFromTransformedIterator?: Generator<
    FragmentReverseTransformation,
    void,
    FragmentPosition | undefined
  >
  parentLiensSectionTa?:
    | JorfTextelrLienSectionTa[]
    | JorfSectionTaLienSectionTa[]
    | LegiSectionTaLienSectionTa[]
    | LegiTextelrLienSectionTa[]
  reference: TextAstReference
  state: TextLinksParserState
}): AsyncGenerator<ArticleLink | DivisionLink, void> {
  if (division.present) {
    // Ignore "la présente section", etc.
    return
  }

  // Find division in given liensSectionTa.
  let divisionLienSectionTa:
    | JorfTextelrLienSectionTa
    | JorfSectionTaLienSectionTa
    | LegiSectionTaLienSectionTa
    | LegiTextelrLienSectionTa
    | undefined = undefined
  if (parentLiensSectionTa === undefined && state.textId !== undefined) {
    const textelr = (
      await legiDb<{ data: JorfTextelr | LegiTextelr }[]>`
        SELECT data
        FROM textelr
        WHERE id = ${state.textId}
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
        const sectionTaNameSplit = divisionLienSectionTa["#text"]!.split(":")[0]
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .map((fragment: string) => fragment.trim())
          .filter((fragment: string) => fragment !== "")
        const position = {
          // Position start - stop = 0 ⇒ invisible
          start: division.position.stop,
          stop: division.position.stop,
        }
        const originalTransformation =
          originalPositionsFromTransformedIterator === undefined
            ? undefined
            : reverseTransformationFromPosition(
                originalPositionsFromTransformedIterator,
                position,
              )
        const insertedDivision = Object.fromEntries(
          Object.entries({
            num: sectionTaNameSplit[1],
            originalTransformation,
            position,
            type: sectionTaNameSplit[0] as DivisionType,
          }).filter(([, value]) => value !== undefined),
        ) as unknown as TextAstDivision
        divisionChildReference = Object.fromEntries(
          Object.entries({
            child: divisionChildReference ?? division,
            parent: insertedDivision,
            originalTransformation,
            position,
            type: "parent-enfant",
          }).filter(([, value]) => value !== undefined),
        ) as unknown as TextAstParentChild
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
      switch (atomicReference.type) {
        case "alinéa":
        case "incomplete-header":
        case "item":
        case "phrase": {
          // Ignore sub-article & incomplete-header references.
          break
        }

        case "article": {
          yield* iterArticleLinks({
            ancestors:
              divisionDeepestDivisionsOrArticles.length === 1
                ? [...(ancestors ?? []), division]
                : undefined,
            article: atomicReference,
            context,
            date,
            legiDb,
            originalPositionsFromTransformedIterator,
            reference,
            state,
          })
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

          yield* iterDivisionLinks({
            ancestors:
              divisionDeepestDivisionsOrArticles.length === 1
                ? [...(ancestors ?? []), division]
                : undefined,
            context,
            date,
            division: atomicReference,
            divisionChildReference: parentChildReference,
            legiDb,
            logIgnoredReferencesTypes,
            originalPositionsFromTransformedIterator,
            parentLiensSectionTa: subdivisionsLiensSectionTa,
            reference,
            state,
          })
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
    state.sectionTaId = divisionLienSectionTa?.["@id"]
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
    yield Object.fromEntries(
      Object.entries({
        division,
        originalTransformation:
          originalPositionsFromTransformedIterator === undefined
            ? undefined
            : reverseTransformationFromPosition(
                originalPositionsFromTransformedIterator,
                position,
              ),
        position,
        reference,
        sectionTaId: state.sectionTaId,
        type: "external_division",
      }).filter(([, value]) => value !== undefined),
    ) as unknown as DivisionLink
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

export async function* iterReferenceLinks({
  articleDefinitionByNumByTextId: articleDefinitionByNumByTextIdInput,
  context,
  date,
  europeDb,
  legiDb,
  logIgnoredReferencesTypes,
  logPartialReferences,
  originalPositionsFromTransformedIterator,
  reference,
  state: inputState,
}: {
  articleDefinitionByNumByTextId?: Record<
    string,
    Record<string, ArticleDefinition>
  >
  context: TextParserContext
  date: string
  europeDb: Sql
  legiDb: Sql
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  originalPositionsFromTransformedIterator?: Generator<
    FragmentReverseTransformation,
    void,
    FragmentPosition | undefined
  >
  reference: TextAstReference
  /**
   * When given, state is modified by this generator, so that the callers
   * always has the latest state version (and can reuse it for the next article,
   * for example).
   */
  state?: TextLinksParserState
}): AsyncGenerator<DefinitionOrLink> {
  const articleDefinitionByNumByTextId =
    articleDefinitionByNumByTextIdInput ?? {}
  const state: TextLinksParserState = inputState === undefined ? {} : inputState
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
    switch (atomicReference.type) {
      case "alinéa":
      case "incomplete-header":
      case "item":
      case "phrase": {
        // Ignore sub-article & incomplete-header references.
        break
      }

      case "article": {
        if (atomicReference.definition && state.textId !== undefined) {
          const articleDefinition =
            articleDefinitionByNumByTextId[state.textId]?.[atomicReference.num!]
          if (articleDefinition !== undefined) {
            yield articleDefinition
          }
        } else {
          yield* iterArticleLinks({
            article: atomicReference,
            context,
            date,
            legiDb,
            originalPositionsFromTransformedIterator,
            reference,
            state,
          })
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
        if (atomicReference.definition && state.textId !== undefined) {
          // TODO
          // const divisionDefinition =
          //   divisionDefinitionByNumByTextId[state.textId]?.[
          //     atomicReference.num!
          //   ]
          // if (divisionDefinition !== undefined) {
          //   yield divisionDefinition
          // }
        } else {
          yield* iterDivisionLinks({
            context,
            date,
            division: atomicReference,
            divisionChildReference: parentChildReference,
            legiDb,
            logIgnoredReferencesTypes,
            originalPositionsFromTransformedIterator,
            reference,
            state,
          })
        }
        break
      }

      case "texte": {
        updateStateTextId({
          context,
          logPartialReferences,
          reference,
          state,
          text: atomicReference,
        })

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
            switch (atomicReferenceInText.type) {
              case "alinéa":
              case "incomplete-header":
              case "item":
              case "phrase": {
                // Ignore sub-article & incomplete-header references.
                break
              }

              case "article": {
                yield* iterArticleLinks({
                  ancestors:
                    textDeepestDivisionsOrArticles.length === 1
                      ? [atomicReference] // text
                      : undefined,
                  article: atomicReferenceInText,
                  context,
                  date,
                  legiDb,
                  originalPositionsFromTransformedIterator,
                  reference,
                  state,
                })
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
                if (state.textId !== undefined) {
                  textelr = (
                    await legiDb<{ data: JorfTextelr | LegiTextelr }[]>`
                    SELECT data
                    FROM textelr
                    WHERE id = ${state.textId}
                  `
                  )[0]?.data
                  if (textelr !== undefined) {
                    liensSectionTa = textelr.STRUCT?.LIEN_SECTION_TA
                  }
                }
                yield* iterDivisionLinks({
                  ancestors:
                    textDeepestDivisionsOrArticles.length === 1
                      ? [atomicReference] // text
                      : undefined,
                  context,
                  date,
                  division: atomicReferenceInText,
                  divisionChildReference: parentChildReferenceInText,
                  legiDb,
                  logIgnoredReferencesTypes,
                  originalPositionsFromTransformedIterator,
                  parentLiensSectionTa: liensSectionTa,
                  reference,
                  state,
                })
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
        if (addedLinksCount === 0) {
          if (atomicReference.position === undefined) {
            throw new Error(
              `Position missing in atomic reference: ${atomicReference}`,
            )
          }
          if (atomicReference.legislation === "UE") {
            console.log(atomicReference)
            const url = (
              await europeDb<{ url: string }[]>`
              SELECT url
              FROM titre_lien
              WHERE title_id = ${atomicReference.num ?? null}
            `
            )[0]?.url
            yield Object.fromEntries(
              Object.entries({
                originalTransformation: atomicReference.originalTransformation,
                position: atomicReference.position,
                reference,
                text: atomicReference,
                titleId: atomicReference.num,
                type: "european_text",
                url,
              }).filter(([, value]) => value !== undefined),
            ) as unknown as TextLink
          } else {
            yield Object.fromEntries(
              Object.entries({
                originalTransformation: atomicReference.originalTransformation,
                position: atomicReference.position,
                reference,
                text: atomicReference,
                type: "external_text",
              }).filter(([, value]) => value !== undefined),
            ) as unknown as TextLink
          }
        }
        break
      }

      default: {
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
