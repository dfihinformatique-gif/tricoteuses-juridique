import * as cheerio from "cheerio"

import type {
  DivisionType,
  PortionType,
  TextAstLocalization,
  TextAstNumber,
  TextAstPortion,
  TextAstReference,
} from "$lib/text_parsers/ast.js"
import {
  divisionTypes,
  isTextAstDivision,
  isTextAstPortion,
  isTextAstAtomicReference,
} from "$lib/text_parsers/ast.js"
import {
  adverbeMultiplicatifLatin,
  multiplicativeLatinSuffixPattern,
} from "$lib/text_parsers/numbers.js"
import { parseText } from "$lib/text_parsers/parsers.js"
import { numeroPortion } from "$lib/text_parsers/portions.js"

export type PortionSelectorStep = {
  type: PortionType | DivisionType
  index?: number
  num?: string
  relative?: TextAstLocalization["relative"]
  present?: boolean
}

export type PortionSelector =
  | {
      kind: "single"
      steps: PortionSelectorStep[]
    }
  | {
      kind: "range"
      first: PortionSelectorStep[]
      last: PortionSelectorStep[]
      count?: number
    }

export type ArticlePortionNode =
  | ArticlePortionArticle
  | ArticlePortionDivision
  | ArticlePortionItem
  | ArticlePortionAlinea

export interface ArticlePortionArticle {
  type: "article"
  children: ArticlePortionNode[]
}

export interface ArticlePortionDivision {
  type: DivisionType
  index?: number
  num?: string
  label?: string
  children: ArticlePortionNode[]
}

export interface ArticlePortionItem {
  type: "item"
  index?: number
  num?: string
  label?: string
  children: ArticlePortionNode[]
}

export interface ArticlePortionAlinea {
  type: "alinéa"
  index: number
  text: string
  html: string
  paragraphIndex: number
}

export type ArticlePortionMatch =
  | {
      selector: PortionSelector
      node: ArticlePortionNode
      path: ArticlePortionNode[]
    }
  | {
      selector: PortionSelector
      start: ArticlePortionNode
      end: ArticlePortionNode
      pathStart: ArticlePortionNode[]
      pathEnd: ArticlePortionNode[]
    }

export const ITEM_PREFIX_RE = new RegExp(
  String.raw`^\s*([IVXLCDM]+|[A-Z]|[a-z]|\d+)(?:\s+(?:${multiplicativeLatinSuffixPattern}))?(?:\s*(?:°|\.|\)|-|–|—))+(?:\s+(?:${multiplicativeLatinSuffixPattern}))?(?:\s+|(?=\p{L}))`,
  "iu",
)
const DIVISION_PREFIX_RE =
  /^\s*(partie|livre|titre|sous-titre|chapitre|section|sous-section|paragraphe|sous-paragraphe|sous-sous-paragraphe)\s+([IVXLCDM]+|[A-Z]|\d+)(?:\s*(?:°|\.|\)|-))?\s*/iu
const DIVISION_LABEL_RE =
  /^(partie|livre|titre|sous-titre|chapitre|section|sous-section|paragraphe|sous-paragraphe|sous-sous-paragraphe)\b/i

const divisionLevelByType: Record<DivisionType, number> = {
  partie: 0,
  livre: 1,
  titre: 2,
  "sous-titre": 3,
  chapitre: 4,
  section: 5,
  "sous-section": 6,
  paragraphe: 7,
  "sous-paragraphe": 8,
  "sous-sous-paragraphe": 9,
}

export function isRomanNumeral(token: string): boolean {
  return /^[IVXLCDM]+$/i.test(token)
}

function parseItemToken(prefix: string): { num: string; index: number } | null {
  const parsed = parseText(prefix, numeroPortion) as TextAstPortion | undefined
  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.type === "item" &&
    typeof parsed.index === "number" &&
    typeof parsed.num === "string"
  ) {
    return { num: parsed.num, index: parsed.index }
  }
  return null
}

function romanToInt(token: string): number | undefined {
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  }
  let total = 0
  let prev = 0
  for (const char of token.toUpperCase()) {
    const value = values[char]
    if (!value) return undefined
    if (value > prev) {
      total += value - 2 * prev
    } else {
      total += value
    }
    prev = value
  }
  return total || undefined
}

function itemIndexFromToken(token: string): number | undefined {
  const trimmed = token.trim()
  const parts = trimmed.split(/\s+/)
  const base = parts[0] ? parts[0].replace(/[^\p{L}\p{N}]+/gu, "") : trimmed
  const suffix = parts.length > 1 ? parts.slice(1).join(" ") : undefined

  const baseIndex = (() => {
    if (/^\d+$/.test(base)) {
      return Number(base)
    }
    if (/^[A-Z]$/i.test(base)) {
      return base.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1
    }
    if (isRomanNumeral(base)) {
      return romanToInt(base)
    }
    return undefined
  })()

  if (baseIndex === undefined) return undefined
  if (!suffix) return baseIndex

  const parsed = parseText(
    suffix,
    adverbeMultiplicatifLatin,
  ) as TextAstNumber | undefined
  if (parsed && typeof parsed === "object" && "value" in parsed) {
    const multiplicative = parsed.value
    if (typeof multiplicative === "number") {
      return baseIndex + multiplicative / 1000
    }
  }

  return baseIndex
}

function itemLevelFromToken(token: string): number {
  const base = 100
  const normalized =
    token.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{N}]+/gu, "") ?? token
  if (
    /^[ivxlcdm]+$/.test(normalized) &&
    (normalized.length > 1 || /^[ivx]$/.test(normalized))
  ) {
    return base + 4
  }
  if (/^[A-Z]$/.test(normalized)) return base + 1
  if (/^\d+$/.test(normalized)) return base + 2
  if (/^[a-z]$/.test(normalized)) return base + 3
  if (isRomanNumeral(normalized)) return base + 0
  return base + 4
}

function nextAlineaIndex(
  parent: ArticlePortionArticle | ArticlePortionDivision | ArticlePortionItem,
) {
  return parent.children.filter((child) => child.type === "alinéa").length + 1
}

export function buildArticlePortionTreeFromHtml(
  html: string,
): ArticlePortionArticle {
  const $ = cheerio.load(html)
  const root: ArticlePortionArticle = { type: "article", children: [] }

  const stack: Array<{
    level: number
    node: ArticlePortionArticle | ArticlePortionDivision | ArticlePortionItem
  }> = [{ level: -1, node: root }]

  const paragraphs = $("p").toArray()

  const splitParagraphLines = (
    paragraphHtml: string,
  ): Array<{
    text: string
    html: string
  }> => {
    const parts = paragraphHtml.split(/<br\s*\/?>/i)
    const lines: Array<{ text: string; html: string }> = []
    for (const part of parts) {
      const text = cheerio.load(part).text().replace(/\s+/g, " ").trim()
      if (!text) continue
      lines.push({ text, html: part })
    }
    return lines.length > 0 ? lines : []
  }

  paragraphs.forEach((p, paragraphIndex) => {
    const $p = $(p)
    const paragraphHtml = $p.html() ?? ""
    const lines = splitParagraphLines(paragraphHtml)
    if (lines.length === 0) {
      const text = ($p.text() || "").replace(/\s+/g, " ").trim()
      if (!text) return
      lines.push({ text, html: paragraphHtml })
    }

    const appendNestedItems = (
      parent: ArticlePortionDivision | ArticlePortionItem,
      restText: string,
      lineHtml: string,
    ) => {
      let currentParent: ArticlePortionDivision | ArticlePortionItem = parent
      let remaining = restText
      while (true) {
        const nestedMatch = remaining.match(ITEM_PREFIX_RE)
        if (!nestedMatch) break
        const parsedToken = parseItemToken(nestedMatch[0])
        const token = parsedToken?.num ?? nestedMatch[1]
        const nestedItem: ArticlePortionItem = {
          type: "item",
          index: parsedToken?.index ?? itemIndexFromToken(token),
          num: token,
          label: undefined,
          children: [],
        }
        currentParent.children.push(nestedItem)
        stack.push({ level: itemLevelFromToken(token), node: nestedItem })
        currentParent = nestedItem
        remaining = remaining.slice(nestedMatch[0].length).trim()
      }
      if (remaining) {
        currentParent.children.push({
          type: "alinéa",
          index: nextAlineaIndex(currentParent),
          text: remaining,
          html: lineHtml,
          paragraphIndex,
        })
      }
    }

    for (const line of lines) {
      const text = line.text
      const divisionMatch = text.match(DIVISION_PREFIX_RE)
      if (divisionMatch) {
        const type = divisionMatch[1].toLowerCase() as DivisionType
        const token = divisionMatch[2]
        const level = divisionLevelByType[type]
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }
        const parent = stack[stack.length - 1]?.node ?? root
        const divisionNode: ArticlePortionDivision = {
          type,
          index: itemIndexFromToken(token),
          num: token,
          label: undefined,
          children: [],
        }
        parent.children.push(divisionNode)
        stack.push({ level, node: divisionNode })

        const restText = text.slice(divisionMatch[0].length).trim()
        if (restText) {
          if (DIVISION_LABEL_RE.test(restText)) {
            divisionNode.label = restText
          } else if (ITEM_PREFIX_RE.test(restText)) {
            appendNestedItems(divisionNode, restText, line.html)
          } else {
            divisionNode.children.push({
              type: "alinéa",
              index: nextAlineaIndex(divisionNode),
              text: restText,
              html: line.html,
              paragraphIndex,
            })
          }
        }
        continue
      }

      const match = text.match(ITEM_PREFIX_RE)
      if (match) {
        const parsedToken = parseItemToken(match[0])
        const token = parsedToken?.num ?? match[1]
        const level = itemLevelFromToken(token)
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }
        const parent = stack[stack.length - 1]?.node ?? root
        const itemNode: ArticlePortionItem = {
          type: "item",
          index: parsedToken?.index ?? itemIndexFromToken(token),
          num: token,
          label: undefined,
          children: [],
        }
        parent.children.push(itemNode)
        stack.push({ level, node: itemNode })

        const restText = text.slice(match[0].length).trim()
        if (restText) {
          if (DIVISION_LABEL_RE.test(restText)) {
            itemNode.label = restText
          } else if (ITEM_PREFIX_RE.test(restText)) {
            appendNestedItems(itemNode, restText, line.html)
          } else {
            itemNode.children.push({
              type: "alinéa",
              index: nextAlineaIndex(itemNode),
              text: restText,
              html: line.html,
              paragraphIndex,
            })
          }
        }
        continue
      }

      const currentParent = stack[stack.length - 1]?.node ?? root
      currentParent.children.push({
        type: "alinéa",
        index: nextAlineaIndex(currentParent),
        text,
        html: line.html,
        paragraphIndex,
      })
    }
  })

  return root
}

function portionStepFromReference(
  reference: TextAstReference,
): PortionSelectorStep[] {
  if (reference.type === "parent-enfant") {
    return [
      ...portionStepFromReference(reference.parent),
      ...portionStepFromReference(reference.child),
    ]
  }

  if (!isTextAstAtomicReference(reference)) {
    return []
  }

  if (isTextAstDivision(reference)) {
    return [
      {
        type: reference.type,
        index: reference.index,
        num: reference.num,
        relative: reference.relative,
        present: reference.present,
      },
    ]
  }

  if (!isTextAstPortion(reference)) {
    return []
  }

  return [
    {
      type: reference.type,
      index: reference.index,
      num: reference.num,
      relative: reference.relative,
      present: reference.present,
    },
  ]
}

function portionSelectorsFromSingleReference(
  reference: TextAstReference,
): PortionSelector[] {
  if (reference.type === "reference_et_action") {
    return portionSelectorsFromSingleReference(reference.reference)
  }

  if (reference.type === "parent-enfant") {
    const parentSelectors = portionSelectorsFromSingleReference(reference.parent)
    const childSelectors = portionSelectorsFromSingleReference(reference.child)

    if (parentSelectors.length === 0) return childSelectors
    if (childSelectors.length === 0) return parentSelectors

    const combined: PortionSelector[] = []
    for (const parentSelector of parentSelectors) {
      for (const childSelector of childSelectors) {
        if (parentSelector.kind === "single" && childSelector.kind === "single") {
          combined.push({
            kind: "single",
            steps: [...parentSelector.steps, ...childSelector.steps],
          })
          continue
        }

        if (parentSelector.kind === "single" && childSelector.kind === "range") {
          combined.push({
            kind: "range",
            first: [...parentSelector.steps, ...childSelector.first],
            last: [...parentSelector.steps, ...childSelector.last],
            count: childSelector.count,
          })
          continue
        }

        if (parentSelector.kind === "range" && childSelector.kind === "single") {
          combined.push({
            kind: "range",
            first: [...parentSelector.first, ...childSelector.steps],
            last: [...parentSelector.last, ...childSelector.steps],
            count: parentSelector.count,
          })
        }
      }
    }

    return combined
  }

  if (reference.type === "bounded-interval") {
    const first = portionStepFromReference(reference.first)
    const last = portionStepFromReference(reference.last)
    if (first.length === 0 || last.length === 0) return []
    return [{ kind: "range", first, last }]
  }

  if (reference.type === "counted-interval") {
    const first = portionStepFromReference(reference.first)
    if (first.length === 0) return []
    return [{ kind: "range", first, last: first, count: reference.count }]
  }

  if (reference.type === "enumeration") {
    return [
      ...portionSelectorsFromSingleReference(reference.left),
      ...portionSelectorsFromSingleReference(reference.right),
    ]
  }

  if (reference.type === "exclusion") {
    return portionSelectorsFromSingleReference(reference.left)
  }

  const steps = portionStepFromReference(reference)
  if (steps.length === 0) return []
  return [{ kind: "single", steps }]
}

export function extractPortionSelectors(
  reference: TextAstReference,
): PortionSelector[] {
  const selectors = portionSelectorsFromSingleReference(reference)
  if (selectors.length === 0) return selectors
  const primary = selectors[0]
  if (primary?.kind === "single" && primary.steps.length > 1) {
    const [first, second] = primary.steps
    if (
      first?.type === "item" &&
      typeof first.num === "string" &&
      /^\d+$/.test(first.num) &&
      second?.type === "item" &&
      typeof second.num === "string" &&
      /°/.test(second.num)
    ) {
      return [primary, { kind: "single", steps: primary.steps.slice(1) }]
    }
  }
  return selectors
}

function matchItemStep(
  node: ArticlePortionItem | ArticlePortionDivision,
  step: PortionSelectorStep,
): boolean {
  if (step.num !== undefined && node.num !== undefined) {
    const normalize = (value: string): string =>
      value.toLowerCase().replace(/[.)]/g, "").trim()
    if (normalize(step.num) !== normalize(node.num)) {
      return false
    }
  }
  if (step.index !== undefined && node.index !== undefined) {
    return step.index === node.index
  }
  if (step.num !== undefined && node.num !== undefined) {
    return true
  }
  return false
}

function resolveStep(
  node:
    | ArticlePortionArticle
    | ArticlePortionDivision
    | ArticlePortionItem
    | ArticlePortionAlinea,
  step: PortionSelectorStep,
): { node: ArticlePortionNode; path: ArticlePortionNode[] } | null {
  const getChildren = (
    current:
      | ArticlePortionArticle
      | ArticlePortionDivision
      | ArticlePortionItem
      | ArticlePortionAlinea,
  ): ArticlePortionNode[] => {
    if (
      "children" in current &&
      (current.type === "article" ||
        current.type === "item" ||
        divisionTypes.includes(current.type as DivisionType))
    ) {
      return current.children
    }
    return []
  }
  const collectAlineasDeep = (
    current:
      | ArticlePortionArticle
      | ArticlePortionDivision
      | ArticlePortionItem
      | ArticlePortionAlinea,
  ): ArticlePortionAlinea[] => {
    if (current.type === "alinéa") return [current]
    if (
      current.type === "article" ||
      current.type === "item" ||
      divisionTypes.includes(current.type as DivisionType)
    ) {
      return current.children.flatMap(collectAlineasDeep)
    }
    return []
  }
  if (divisionTypes.includes(step.type as DivisionType)) {
    const children = getChildren(node)
    for (const child of children) {
      if (
        divisionTypes.includes(child.type as DivisionType) &&
        child.type === step.type &&
        matchItemStep(child as ArticlePortionDivision, step)
      ) {
        return { node: child, path: [child] }
      }
    }
    return null
  }

  if (step.type === "item") {
    const children = getChildren(node)
    for (const child of children) {
      if (child.type === "item" && matchItemStep(child, step)) {
        return { node: child, path: [child] }
      }
    }
    for (const child of children) {
      if (child.type === "alinéa") continue
      const resolved = resolveStep(child, step)
      if (resolved) {
        return { node: resolved.node, path: [child, ...resolved.path] }
      }
    }
    return null
  }

  if (step.type === "alinéa") {
    const children = getChildren(node)
    const alineas = children.filter(
      (child): child is ArticlePortionAlinea => child.type === "alinéa",
    )
    if (alineas.length === 0) return null

    if (step.index !== undefined) {
      const idx = step.index
      const list = idx < 0 ? collectAlineasDeep(node) : alineas
      if (list.length === 0) return null
      const resolvedIndex = idx < 0 ? list.length + idx + 1 : idx
      if (resolvedIndex < 1 || resolvedIndex > list.length) return null
      const selected = list[resolvedIndex - 1]
      return { node: selected, path: [selected] }
    }
    return null
  }

  if (step.type === "phrase") {
    if (node.type !== "alinéa") return null
    if (step.index === undefined) return null
    const phrases = node.text
      .split(/(?<=[.!?;:])\s+/)
      .map((phrase) => phrase.trim())
      .filter(Boolean)
    const idx = step.index
    const resolvedIndex = idx < 0 ? phrases.length + idx + 1 : idx
    if (resolvedIndex < 1 || resolvedIndex > phrases.length) return null
    const phraseText = phrases[resolvedIndex - 1]
    return {
      node: {
        type: "alinéa",
        index: node.index,
        text: phraseText,
        html: node.html,
        paragraphIndex: node.paragraphIndex,
      },
      path: [node],
    }
  }

  return null
}

export function resolvePortionSelector(
  article: ArticlePortionArticle,
  selector: PortionSelector,
): ArticlePortionMatch | null {
  if (selector.kind === "range") {
    const start = resolvePortionSelector(article, {
      kind: "single",
      steps: selector.first,
    })
    const end = resolvePortionSelector(article, {
      kind: "single",
      steps: selector.last,
    })
    if (
      !start ||
      !end ||
      "node" in start === false ||
      "node" in end === false
    ) {
      return null
    }
    return {
      selector,
      start: start.node,
      end: end.node,
      pathStart: start.path,
      pathEnd: end.path,
    }
  }

  let current:
    | ArticlePortionArticle
    | ArticlePortionItem
    | ArticlePortionAlinea = article
  const path: ArticlePortionNode[] = []

  for (const step of selector.steps) {
    const resolved = resolveStep(current, step)
    if (!resolved) {
      return null
    }
    current = resolved.node as
      | ArticlePortionArticle
      | ArticlePortionItem
      | ArticlePortionAlinea
    path.push(...resolved.path)
  }

  return { selector, node: current, path }
}
