import {
  extractPortionSelectors,
  ITEM_PREFIX_RE,
  isRomanNumeral,
  type PortionSelector,
} from "$lib/extractors/article_portions.js"
import { getExtractedReferences } from "$lib/extractors/references.js"
import type {
  ActionTarget,
  CompoundReferencesSeparator,
  TextAstAction,
  TextAstArticle,
  TextAstAtomicReference,
  TextAstCitation,
  TextAstReference,
} from "$lib/text_parsers/ast.js"
import {
  actionTargetFromReference,
  addChildLeftToLastChild,
  createEnumerationOrBoundedInterval,
  iterAtomicReferences,
} from "$lib/text_parsers/helpers.js"
import type { FragmentPosition } from "$lib/text_parsers/fragments.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { citation, convertCitationToText } from "$lib/text_parsers/citations.js"
import { article } from "$lib/text_parsers/articles.js"
import { portion } from "$lib/text_parsers/portions.js"
import {
  adjectifNumeralOrdinal,
  nombreAsTextAstNumber,
} from "$lib/text_parsers/numbers.js"
import {
  simplifyHtml,
  simplifyPlainText,
} from "$lib/text_parsers/simplifiers.js"

export type ActionDirective =
  | {
      kind: "insert_after" | "insert_before"
      targetType: ActionTarget
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      targetText: string
      insertText: string
      sourcePosition: FragmentPosition
      sourceText: string
    }
  | {
      kind: "replace_portion"
      targetType: ActionTarget
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      replacementText: string
      sourcePosition: FragmentPosition
      sourceText: string
    }
  | {
      kind: "replace"
      targetType: ActionTarget
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      targetText: string
      replacementText: string
      sourcePosition: FragmentPosition
      sourceText: string
    }
  | {
      kind: "delete"
      targetType: ActionTarget
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      targetText: string
      occurrenceIndex?: number
      sourcePosition: FragmentPosition
      sourceText: string
    }
  | {
      kind: "delete_portion"
      targetType: ActionTarget
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      sourcePosition: FragmentPosition
      sourceText: string
    }
  | {
      kind: "delete_article"
      targetType: "article"
      reference: TextAstReference
      portionSelectors: PortionSelector[]
      sourcePosition: FragmentPosition
      sourceText: string
    }

type ParsedActionKind =
  | {
      kind: "insert_after" | "insert_before"
      targetText: string
      insertText: string
    }
  | { kind: "replace_portion"; replacementText: string }
  | { kind: "replace"; targetText: string; replacementText: string }
  | { kind: "delete"; targetText: string; extraTargetTexts?: string[] }
  | { kind: "delete_portion" }
  | { kind: "delete_article" }

function normalizeActionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function stripLineLeader(line: string): string {
  return line.replace(ITEM_PREFIX_RE, "")
}

type LineWithOffset = {
  text: string
  start: number
  end: number
}

type QuotedTextInfo = {
  text: string
  start: number
  end: number
}

function splitLinesWithOffsets(text: string): LineWithOffset[] {
  const lines = text.split("\n")
  const output: LineWithOffset[] = []
  let offset = 0
  for (const line of lines) {
    const start = offset
    const end = start + line.length
    output.push({ text: line, start, end })
    offset = end + 1
  }
  return output
}

function isListItemStart(line: string): boolean {
  return ITEM_PREFIX_RE.test(line)
}

type ItemMarkerInfo = {
  marker: string
  level: number
}

function getItemMarkerInfo(line: string): ItemMarkerInfo | null {
  const match = ITEM_PREFIX_RE.exec(line)
  if (!match) return null
  const marker = match[1] ?? ""
  if (!marker) return null
  if (/^\d+$/.test(marker)) {
    return { marker, level: 2 }
  }
  if (
    /^[ivxlcdm]+$/.test(marker) &&
    (marker.length > 1 || /^[ivx]$/.test(marker))
  ) {
    return { marker, level: 4 }
  }
  if (/^[a-z]$/.test(marker)) {
    return { marker, level: 3 }
  }
  if (isRomanNumeral(marker)) {
    return { marker, level: 1 }
  }
  if (/^[A-Z]$/.test(marker)) {
    return { marker, level: 1 }
  }
  return { marker, level: 2 }
}

function findFirstActionIndex(text: string): number | null {
  const normalized = normalizeActionText(text)
  const match =
    /(?:^|[^\p{L}])(insere(?:e|es|s)?|ajoute(?:e|es|s)?|remplace(?:e|es|s)?|supprime(?:e|es|s)?|abroge(?:e|es|s)?|complete(?:e|es|s)?|retabli(?:e|es|s)?)(?=$|[^\p{L}])/u.exec(
      normalized,
    )
  if (!match) return null
  return (match.index ?? 0) + (match[0].length - match[1].length)
}

function unwrapReference(reference: TextAstReference): TextAstReference {
  return reference.type === "reference_et_action"
    ? reference.reference
    : reference
}

function pickArticleReference(text: string): TextAstReference | null {
  const references = getExtractedReferences(new TextParserContext(text))
  const article = references
    .map(unwrapReference)
    .find((reference) => actionTargetFromReference(reference) === "article")
  if (article) return article
  const fallback = fallbackArticleReference(text)
  return fallback?.reference ?? null
}

function pickPortionReferenceForItem(text: string): TextAstReference | null {
  const actionIndex = findFirstActionIndex(text) ?? text.length
  const quoteRanges = getQuoteRanges(text)
  const references = getExtractedReferences(new TextParserContext(text))
  const candidates = references
    .map(unwrapReference)
    .filter(
      (reference) =>
        !isInsideQuoteRanges(reference.position, quoteRanges) &&
        actionTargetFromReference(reference) !== "article" &&
      (reference.position?.start ?? 0) < actionIndex,
    )
    .sort((a, b) => (a.position?.start ?? 0) - (b.position?.start ?? 0))
  if (candidates[0]) return candidates[0]

  const prefix = text.slice(0, actionIndex).trimEnd()
  return (
    extractSharedTrailingNaturePortionReference(prefix, 0) ??
    extractSharedTrailingNaturePortionReference(
      prefix.replace(/\b(?:est|sont)\s*$/iu, "").trimEnd(),
      0,
    )
  )
}

function pickContextReferenceForItem(text: string): TextAstReference | null {
  const actionIndex = findFirstActionIndex(text) ?? text.length
  const quoteRanges = getQuoteRanges(text)
  const references = getExtractedReferences(new TextParserContext(text))
    .map(unwrapReference)
    .filter(
      (reference) =>
        !isInsideQuoteRanges(reference.position, quoteRanges) &&
        (reference.position?.start ?? 0) < actionIndex,
    )
    .sort((a, b) => (a.position?.start ?? 0) - (b.position?.start ?? 0))
  if (references.length === 0) return null
  const nonArticle =
    references.find(
      (reference) => actionTargetFromReference(reference) !== "article",
    ) ?? null
  return nonArticle ?? references[0] ?? null
}

function pickBestListContextReference(text: string): TextAstReference | null {
  const candidates = [text, stripLineLeader(text)]
    .map((candidate) => candidate.trim())
    .filter((candidate, index, array) => candidate && array.indexOf(candidate) === index)

  for (const candidate of candidates) {
    const reference =
      extractSharedTrailingNaturePortionReference(candidate, 0) ??
      buildPortionReferenceFromText(candidate) ??
      pickContextReferenceForItem(candidate) ??
      pickArticleReference(candidate)
    if (reference) return reference
  }

  return null
}

function normalizeReferenceNum(value: string | undefined): string | undefined {
  return value?.toLowerCase().replace(/[.)]/g, "").trim()
}

function areEquivalentAtomicReferences(
  left: TextAstAtomicReference,
  right: TextAstAtomicReference,
): boolean {
  if (left.type !== right.type) return false
  if (left.index !== undefined && right.index !== undefined) {
    if (left.index !== right.index) return false
  }
  if (left.num !== undefined && right.num !== undefined) {
    if (normalizeReferenceNum(left.num) !== normalizeReferenceNum(right.num)) {
      return false
    }
  }
  return true
}

function getLastAtomicReference(
  reference: TextAstReference,
): TextAstAtomicReference | null {
  let last: TextAstAtomicReference | null = null
  for (const atomic of iterAtomicReferences(reference)) {
    last = atomic
  }
  return last
}

function stripDuplicateLeadingReference(
  reference: TextAstReference,
  duplicate: TextAstAtomicReference | null,
): TextAstReference {
  if (!duplicate) return reference
  if (
    reference.type === "parent-enfant" &&
    areEquivalentAtomicReferences(reference.parent, duplicate)
  ) {
    return reference.child
  }
  return reference
}

function getLastAbsoluteAtomicReferenceByType(
  reference: TextAstReference,
  type: TextAstAtomicReference["type"],
): TextAstAtomicReference | null {
  let last: TextAstAtomicReference | null = null
  for (const atomic of iterAtomicReferences(reference)) {
    if (atomic.type !== type) continue
    if (atomic.relative !== undefined) continue
    if (atomic.index === undefined && atomic.num === undefined) continue
    last = atomic
  }
  return last
}

function resolveRelativeReferencesWithContext(
  reference: TextAstReference,
  contextReference: TextAstReference | null,
): TextAstReference {
  if (!contextReference) return reference
  const clone = structuredClone(reference) as TextAstReference

  const visit = (current: TextAstReference): void => {
    if (
      current.type !== "parent-enfant" &&
      current.type !== "bounded-interval" &&
      current.type !== "counted-interval" &&
      current.type !== "enumeration" &&
      current.type !== "exclusion" &&
      current.type !== "reference_et_action"
    ) {
      if (current.relative === 0) {
        const fallback = getLastAbsoluteAtomicReferenceByType(
          contextReference,
          current.type,
        )
        if (fallback) {
          current.index = fallback.index
          current.num = fallback.num
          delete current.relative
        }
      }
      return
    }

    switch (current.type) {
      case "parent-enfant":
        visit(current.parent)
        visit(current.child)
        break
      case "bounded-interval":
        visit(current.first)
        visit(current.last)
        break
      case "counted-interval":
        visit(current.first)
        break
      case "enumeration":
      case "exclusion":
        visit(current.left)
        visit(current.right)
        break
      case "reference_et_action":
        visit(current.reference)
        break
    }
  }

  visit(clone)
  return clone
}

function hasRelativeReference(reference: TextAstReference): boolean {
  const visit = (current: TextAstReference): boolean => {
    if (
      current.type !== "parent-enfant" &&
      current.type !== "bounded-interval" &&
      current.type !== "counted-interval" &&
      current.type !== "enumeration" &&
      current.type !== "exclusion" &&
      current.type !== "reference_et_action"
    ) {
      return current.relative !== undefined
    }

    switch (current.type) {
      case "parent-enfant":
        return visit(current.parent) || visit(current.child)
      case "bounded-interval":
        return visit(current.first) || visit(current.last)
      case "counted-interval":
        return visit(current.first)
      case "enumeration":
      case "exclusion":
        return visit(current.left) || visit(current.right)
      case "reference_et_action":
        return visit(current.reference)
    }
  }

  return visit(reference)
}

type ListItemNode = {
  body: LineWithOffset[]
  children: ListItemNode[]
  level: number
  line: LineWithOffset
}

function buildListItemTree(lines: LineWithOffset[]): ListItemNode[] {
  const roots: ListItemNode[] = []
  const stack: ListItemNode[] = []

  for (const line of lines) {
    if (!isListItemStart(line.text)) {
      stack[stack.length - 1]?.body.push(line)
      continue
    }

    const level = getItemMarkerInfo(line.text)?.level ?? 0
    const node: ListItemNode = {
      body: [],
      children: [],
      level,
      line,
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1]?.children.push(node)
    }

    stack.push(node)
  }

  return roots
}

function combineListContextReference(
  baseReference: TextAstReference | null,
  localReference: TextAstReference | null,
): TextAstReference | null {
  if (!baseReference) return localReference
  if (!localReference) return baseReference

  const lastAtomicReference = getLastAtomicReference(baseReference)
  const normalizedLocalReference = stripDuplicateLeadingReference(
    localReference,
    lastAtomicReference,
  )

  if (
    normalizedLocalReference.type === "article" ||
    actionTargetFromReference(normalizedLocalReference) === "article"
  ) {
    return addChildLeftToLastChild(baseReference, normalizedLocalReference)
  }

  return addChildLeftToLastChild(baseReference, normalizedLocalReference)
}

function getListItemText(node: ListItemNode): string {
  return [stripLineLeader(node.line.text), ...node.body.map((line) => line.text)]
    .join("\n")
    .trim()
}

function getListItemEnd(node: ListItemNode): number {
  return node.body[node.body.length - 1]?.end ?? node.line.end
}

function processListItemNodes(
  nodes: ListItemNode[],
  inheritedReference: TextAstReference | null,
): ActionDirective[] {
  const directives: ActionDirective[] = []
  let previousDirectiveReference = inheritedReference

  for (const node of nodes) {
    const lineText = stripLineLeader(node.line.text)
    const itemText = getListItemText(node)
    if (!itemText) continue

    const lineReference = pickBestListContextReference(lineText)
    const nodeReference = combineListContextReference(
      inheritedReference,
      lineReference,
    )
    const hasAction = findFirstActionIndex(itemText) !== null

    if (node.children.length > 0) {
      const childReference = nodeReference ?? inheritedReference
      const childDirectives = processListItemNodes(node.children, childReference)
      if (childDirectives.length > 0) {
        directives.push(...childDirectives)
        previousDirectiveReference =
          childDirectives[childDirectives.length - 1]?.reference ??
          previousDirectiveReference
      }
      continue
    }

    if (!hasAction) {
      previousDirectiveReference = nodeReference ?? previousDirectiveReference
      continue
    }

    const explicitArticleReference = pickArticleReference(itemText)
    const localReference =
      pickPortionReferenceForItem(itemText) ??
      explicitArticleReference ??
      lineReference

    let reference =
      combineListContextReference(inheritedReference, localReference) ??
      explicitArticleReference ??
      nodeReference
    if (!reference) continue

    reference = resolveRelativeReferencesWithContext(
      reference,
      hasRelativeReference(reference)
        ? previousDirectiveReference ?? inheritedReference
        : inheritedReference,
    )

    const directive = buildActionDirective({
      action: { action: "modifier" },
      reference,
      sourcePosition: { start: node.line.start, stop: getListItemEnd(node) },
      sourceText: itemText,
    })

    if (!directive) {
      previousDirectiveReference = reference
      continue
    }

    if (Array.isArray(directive)) {
      directives.push(...directive)
    } else {
      directives.push(directive)
    }
    previousDirectiveReference = reference
  }

  return directives
}

function extractListItemDirectives(text: string): ActionDirective[] | null {
  const lines = splitLinesWithOffsets(text)
  const firstItemIndex = lines.findIndex((line) => isListItemStart(line.text))
  if (firstItemIndex === -1) return null

  const baseReference =
    lines
      .slice(0, firstItemIndex)
      .reverse()
      .map((line) => pickBestListContextReference(line.text))
      .find((reference): reference is TextAstReference => reference !== null) ??
    null
  const items = buildListItemTree(lines.slice(firstItemIndex))
  const directives = processListItemNodes(items, baseReference)
  return directives.length > 0 ? directives : null
}

function normalizeQuotedText(text: string): string {
  const cleaned = text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[«“"]\s*/u, "").trim())
    .filter((line) => line.length > 0)
    .join("\n")
  return cleaned.replace(/[»”"]\s*$/u, "").trim()
}

function extractQuotedTextInfos(text: string): QuotedTextInfo[] {
  const results: QuotedTextInfo[] = []
  let offset = 0
  while (offset < text.length) {
    const start = text.indexOf("«", offset)
    if (start === -1) break
    const context = new TextParserContext(text)
    context.offset = start
    const parsed = citation(context) as TextAstCitation | undefined
    if (!parsed) {
      offset = start + 1
      continue
    }
    const transformed = convertCitationToText(context, parsed)
    const normalized = normalizeQuotedText(transformed.output)
    const position = parsed.position ?? { start, stop: start + 1 }
    results.push({ text: normalized, start: position.start, end: position.stop })
    const nextOffset = position.stop ?? start + 1
    offset = Math.max(nextOffset, start + 1)
  }
  return results
}

function parseOccurrenceIndexFromToken(token: string): number | null {
  const cleaned = token.trim()
  if (!cleaned) return null
  const ordinalContext = new TextParserContext(cleaned)
  const ordinal = adjectifNumeralOrdinal(ordinalContext)
  if (typeof ordinal === "number") return ordinal
  if (ordinal && typeof ordinal === "object" && "value" in ordinal) {
    const value = (ordinal as { value: number }).value
    return Number.isFinite(value) ? value : null
  }
  const cardinalContext = new TextParserContext(cleaned)
  const cardinal = nombreAsTextAstNumber(cardinalContext)
  if (cardinal && typeof cardinal === "object" && "value" in cardinal) {
    const value = (cardinal as { value: number }).value
    return Number.isFinite(value) ? value : null
  }
  if (typeof cardinal === "number") return cardinal
  return null
}

function extractOccurrenceIndex(
  text: string,
  quoteStart: number,
): number | null {
  const prefix = text.slice(0, quoteStart)
  const regex =
    /([0-9A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)\s+occurrence\b/giu
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = regex.exec(prefix)) !== null) {
    lastMatch = match
  }
  if (!lastMatch) return null
  const token = lastMatch[1]
  const index = parseOccurrenceIndexFromToken(token)
  if (!index || index < 1) return null
  return index
}

type QuoteRange = { start: number; end: number }

function getQuoteRanges(text: string): QuoteRange[] {
  const ranges: QuoteRange[] = []
  let index = 0
  while (index < text.length) {
    const start = text.indexOf("«", index)
    if (start === -1) break
    const end = text.indexOf("»", start + 1)
    if (end === -1) {
      ranges.push({ start, end: text.length })
      break
    }
    ranges.push({ start, end: end + 1 })
    index = end + 1
  }
  return ranges
}

function isInsideQuoteRanges(
  position: FragmentPosition | undefined,
  quoteRanges: QuoteRange[],
): boolean {
  if (!position) return false
  return quoteRanges.some(
    (range) => position.start >= range.start && position.stop <= range.end,
  )
}

function replaceQuotedTextWithSpaces(text: string): string {
  if (!text.includes("«")) return text
  const chars = text.split("")
  let inQuote = false
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char === "«") {
      inQuote = true
      continue
    }
    if (char === "»") {
      inQuote = false
      continue
    }
    if (inQuote) {
      chars[i] = " "
    }
  }
  return chars.join("")
}

function shiftPosition(
  position: FragmentPosition | undefined,
  offset: number,
): void {
  if (!position) return
  position.start += offset
  position.stop += offset
}

function shiftReferencePositions(
  reference: TextAstReference,
  offset: number,
): void {
  if (reference.type === "parent-enfant") {
    shiftReferencePositions(reference.parent, offset)
    shiftReferencePositions(reference.child, offset)
    shiftPosition(reference.position, offset)
    return
  }

  if (reference.type === "bounded-interval") {
    shiftReferencePositions(reference.first, offset)
    shiftReferencePositions(reference.last, offset)
    shiftPosition(reference.position, offset)
    return
  }

  if (reference.type === "counted-interval") {
    shiftReferencePositions(reference.first, offset)
    shiftPosition(reference.position, offset)
    return
  }

  if (reference.type === "enumeration" || reference.type === "exclusion") {
    shiftReferencePositions(reference.left, offset)
    shiftReferencePositions(reference.right, offset)
    shiftPosition(reference.position, offset)
    return
  }

  if (reference.type === "reference_et_action") {
    shiftReferencePositions(reference.reference, offset)
    shiftPosition(reference.position, offset)
    return
  }

  shiftPosition(reference.position, offset)
}

function trimTrailingArticleIntro(prefix: string): string {
  return prefix.replace(/\b(de\s+l['’]?|de\s+la|de\s+le|du|des)\s*$/i, "")
}

function singularPortionNature(
  value: string,
): "alinéa" | "phrase" | null {
  const normalized = normalizeActionText(value)
  if (normalized.startsWith("alinea")) return "alinéa"
  if (normalized.startsWith("phrase")) return "phrase"
  return null
}

function stripLeadingPortionIntroducer(segment: string): {
  text: string
  offset: number
} | null {
  const introMatch =
    /^(?:(?:[aà]\s+)?l['’]|(?:[aà]\s+)?la\b|(?:[aà]\s+)?le\b|les\b|des\b|aux\b|du\b)\s*/iu.exec(
      segment,
    )
  const offset = introMatch?.[0].length ?? 0
  const text = segment
    .slice(offset > 0 ? offset : 0)
    .trim()
  return text ? { text, offset } : null
}

function parseSyntheticPortionReference(text: string): TextAstReference | null {
  const context = new TextParserContext(text)
  const parsed = portion(context) as TextAstReference | undefined
  if (!parsed || context.remaining().trim().length !== 0) return null
  return parsed
}

function extractSharedTrailingNaturePortionReference(
  prefix: string,
  prefixOffset: number,
): TextAstReference | null {
  const cleaned = prefix.trim().replace(/[;:,]\s*$/u, "").trim()
  if (!cleaned) return null

  const wordMatches = [...cleaned.matchAll(/\p{L}/gu)]
  for (const wordMatch of wordMatches) {
    const candidateStart = wordMatch.index ?? 0
    const candidate = cleaned.slice(candidateStart).trim()
    const natureMatch = /\b(alinéas?|phrases?)\b\s*$/iu.exec(candidate)
    if (!natureMatch || natureMatch.index === undefined) continue

    const portionNature = singularPortionNature(natureMatch[1] ?? "")
    if (!portionNature) continue

    const body = candidate.slice(0, natureMatch.index).trim()
    if (!body) continue

    const segmentRegex = /\s*(,|\bet\b|\bou\b)\s*/giu
    const rawSegments: Array<{
      separator?: CompoundReferencesSeparator
      start: number
      text: string
    }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = segmentRegex.exec(body)) !== null) {
      const separatorToken = normalizeActionText(match[1] ?? "")
      rawSegments.push({
        separator:
          separatorToken === "ou" ? "ou" : separatorToken === "," ? "," : "et",
        start: lastIndex,
        text: body.slice(lastIndex, match.index),
      })
      lastIndex = segmentRegex.lastIndex
    }
    rawSegments.push({ start: lastIndex, text: body.slice(lastIndex) })

    if (rawSegments.length < 2) continue

    const parsedSegments: TextAstReference[] = []
    const separators: CompoundReferencesSeparator[] = []
    let canBuildRange = true
    let previousIndex: number | undefined

    for (const [index, rawSegment] of rawSegments.entries()) {
      const stripped = stripLeadingPortionIntroducer(rawSegment.text)
      if (!stripped) {
        parsedSegments.length = 0
        break
      }

      const syntheticReference = parseSyntheticPortionReference(
        `${stripped.text} ${portionNature}`,
      )
      if (!syntheticReference) {
        parsedSegments.length = 0
        break
      }

      shiftReferencePositions(
        syntheticReference,
        prefixOffset + candidateStart + rawSegment.start + stripped.offset,
      )
      parsedSegments.push(syntheticReference)

      if (
        syntheticReference.type !== portionNature ||
        syntheticReference.index === undefined ||
        syntheticReference.index < 1
      ) {
        canBuildRange = false
      } else if (previousIndex !== undefined && syntheticReference.index !== previousIndex + 1) {
        canBuildRange = false
      } else {
        previousIndex = syntheticReference.index
      }

      if (index < rawSegments.length - 1) {
        separators.push(rawSegment.separator ?? "et")
        if ((rawSegment.separator ?? "et") === "ou") {
          canBuildRange = false
        }
      }
    }

    const [first, ...rest] = parsedSegments
    if (!first || rest.length === 0) continue

    const position = {
      start: prefixOffset + candidateStart + rawSegments[0]!.start,
      stop: prefixOffset + candidateStart + candidate.length,
    }

    if (canBuildRange) {
      return {
        first,
        last: parsedSegments[parsedSegments.length - 1]!,
        position,
        type: "bounded-interval",
      }
    }

    return createEnumerationOrBoundedInterval(
      first,
      rest.map((reference, index) => [separators[index] ?? "et", reference]),
      position,
    )
  }

  return null
}

function extractPortionReferenceFromPrefix(
  prefix: string,
  prefixOffset: number,
): TextAstReference | null {
  const cleaned = trimTrailingArticleIntro(prefix)
  if (!cleaned) return null

  const sharedNatureReference = extractSharedTrailingNaturePortionReference(
    cleaned,
    prefixOffset,
  )
  if (sharedNatureReference) return sharedNatureReference

  const wordMatches = [...cleaned.matchAll(/\p{L}/gu)]
  for (const match of wordMatches) {
    const startIndex = match.index ?? 0
    const candidate = cleaned.slice(startIndex)
    if (!candidate) continue

    const context = new TextParserContext(candidate)
    const parsed = portion(context) as TextAstReference | undefined
    if (!parsed || context.offset === 0) continue

    if (candidate.slice(context.offset).trim().length !== 0) continue
    shiftReferencePositions(parsed, prefixOffset + startIndex)
    return parsed
  }

  return null
}

function buildPortionReferenceFromText(text: string): TextAstReference | null {
  const articleMatch = /\barticle\b/i.exec(text)
  if (!articleMatch || articleMatch.index === undefined) return null
  const articleIndex = articleMatch.index
  const articleText = text.slice(articleIndex)
  const articleContext = new TextParserContext(articleText)
  const parsedArticle = article(articleContext) as TextAstArticle | undefined
  if (!parsedArticle) return null
  shiftReferencePositions(parsedArticle, articleIndex)

  const prefix = text.slice(0, articleIndex)
  const portionReference = extractPortionReferenceFromPrefix(prefix, 0)
  if (!portionReference) return null

  return addChildLeftToLastChild(parsedArticle, portionReference)
}

function parseActionFromText(
  text: string,
  action: TextAstAction,
  targetType: ActionTarget,
  quoted: string[],
): ParsedActionKind | null {
  const normalized = normalizeActionText(text)
  const hasRedactionIntro =
    /\bredige\b|\bredigee\b|\bredigees\b|\brediges\b|\bainsi\b/.test(
      normalized,
    ) || /\bdispositions suivantes\b/.test(normalized)

  const hasAfter =
    /\bapres\b/.test(normalized) ||
    /\bapres (la|les) reference\b|\bapres (le|les) mots\b|\bapres la mention\b/.test(
      normalized,
    )
  const hasBefore =
    /\bavant\b/.test(normalized) ||
    /\bavant (la|les) reference\b|\bavant (le|les) mots\b|\bavant la mention\b/.test(
      normalized,
    )
  const isReestablish =
    action.action === "rétablir" || /\bretabl/.test(normalized)
  const isInsert =
    /\binsere(?:e|es|s)?\b|\bajoute\b|\bajoutee\b|\bajoutes\b|\bajoutees\b|\bcomplete\b/.test(
      normalized,
    ) || isReestablish
  const isReplace =
    /\bremplace\b|\bremplacee\b|\bremplaces\b|\bremplacees\b/.test(normalized)
  const isDelete =
    /\bsupprime\b|\bsupprimee\b|\bsupprimes\b|\bsupprimees\b|\babroge\b|\babrogee\b|\babroges\b|\babrogees\b/.test(
      normalized,
    )

  if (action.action === "supprimer" || isDelete) {
    if (targetType === "article" && quoted.length === 0) {
      return { kind: "delete_article" }
    }
    if (quoted.length >= 1) {
      return {
        kind: "delete",
        targetText: quoted[0],
        extraTargetTexts: quoted.slice(1),
      }
    }
    return { kind: "delete_portion" }
  }

  if (isReplace && quoted.length >= 2) {
    return {
      kind: "replace",
      targetText: quoted[0],
      replacementText: quoted[1],
    }
  }

  if (isReplace && quoted.length === 1 && hasRedactionIntro) {
    return {
      kind: "replace_portion",
      replacementText: quoted[0],
    }
  }

  if (isInsert && quoted.length >= 2) {
    if (hasAfter) {
      return {
        kind: "insert_after",
        targetText: quoted[0],
        insertText: quoted[1],
      }
    }
    if (hasBefore) {
      return {
        kind: "insert_before",
        targetText: quoted[0],
        insertText: quoted[1],
      }
    }
  }

  if (isInsert && quoted.length === 1) {
    if (hasAfter) {
      return {
        kind: "insert_after",
        targetText: "",
        insertText: quoted[0],
      }
    }
    if (hasBefore) {
      return {
        kind: "insert_before",
        targetText: "",
        insertText: quoted[0],
      }
    }
    return {
      kind: "insert_after",
      targetText: "",
      insertText: quoted[0],
    }
  }

  return null
}

function buildActionDirective({
  action,
  reference,
  sourcePosition,
  sourceText,
  fullText,
}: {
  action: TextAstAction
  reference: TextAstReference
  sourcePosition: FragmentPosition
  sourceText: string
  fullText?: string
}): ActionDirective | ActionDirective[] | null {
  const targetType = action.target ?? actionTargetFromReference(reference)
  const portionSelectors = extractPortionSelectors(reference)
  const quoteSourceText =
    fullText && sourcePosition.start < fullText.length
      ? fullText.slice(sourcePosition.start)
      : sourceText
  const quotedInfos = extractQuotedTextInfos(quoteSourceText)
  const quotedTexts = quotedInfos.map((info) => info.text)
  const parsed = parseActionFromText(sourceText, action, targetType, quotedTexts)
  if (!parsed) return null

  switch (parsed.kind) {
    case "insert_after":
    case "insert_before":
      return {
        kind: parsed.kind,
        targetType,
        reference,
        portionSelectors,
        targetText: parsed.targetText,
        insertText: parsed.insertText,
        sourcePosition,
        sourceText,
      }
    case "replace":
      return {
        kind: "replace",
        targetType,
        reference,
        portionSelectors,
        targetText: parsed.targetText,
        replacementText: parsed.replacementText,
        sourcePosition,
        sourceText,
      }
    case "replace_portion":
      return {
        kind: "replace_portion",
        targetType,
        reference,
        portionSelectors,
        replacementText: parsed.replacementText,
        sourcePosition,
        sourceText,
      }
    case "delete": {
      const occurrenceIndices = quotedInfos.map((info) =>
        extractOccurrenceIndex(quoteSourceText, info.start),
      )
      const occurrenceByTarget = new Map<string, number | null>()
      for (const [index, info] of quotedInfos.entries()) {
        if (!occurrenceByTarget.has(info.text)) {
          occurrenceByTarget.set(info.text, occurrenceIndices[index] ?? null)
        }
      }
      const targets = [
        parsed.targetText,
        ...(parsed.extraTargetTexts ?? []),
      ]
        .filter((value) => value && value.trim().length > 0)
        .filter((value, index, array) => array.indexOf(value) === index)
      if (targets.length > 1) {
        return targets.map((targetText) => ({
          kind: "delete",
          targetType,
          reference,
          portionSelectors,
          targetText,
          occurrenceIndex: occurrenceByTarget.get(targetText) ?? undefined,
          sourcePosition,
          sourceText,
        }))
      }
      return {
        kind: "delete",
        targetType,
        reference,
        portionSelectors,
        targetText: parsed.targetText,
        occurrenceIndex: occurrenceByTarget.get(parsed.targetText) ?? undefined,
        sourcePosition,
        sourceText,
      }
    }
    case "delete_portion":
      return {
        kind: "delete_portion",
        targetType,
        reference,
        portionSelectors,
        sourcePosition,
        sourceText,
      }
    case "delete_article":
      if (targetType !== "article") return null
      return {
        kind: "delete_article",
        targetType,
        reference,
        portionSelectors,
        sourcePosition,
        sourceText,
      }
    default:
      return null
  }
}

function fallbackArticleReference(text: string): {
  reference: TextAstArticle
  position: FragmentPosition
} | null {
  const match =
    /\barticle\s+([0-9]+(?:-[0-9]+)?(?:\s*[A-Z])?(?:\s+[a-z]+)?)\b/i.exec(text)
  if (!match || match.index === undefined) return null
  const start = match.index
  const stop = match.index + match[0].length
  const article: TextAstArticle = {
    num: match[1].trim(),
    position: { start, stop },
    type: "article",
  }
  return { reference: article, position: { start, stop } }
}

function extractActionDirectivesFromTextInternal(
  text: string,
  options: { allowListExtraction: boolean },
): ActionDirective[] {
  const simplified = simplifyPlainText(text)
  const simplifiedText = simplified.output

  if (options.allowListExtraction) {
    const listDirectives = extractListItemDirectives(simplifiedText)
    if (listDirectives) return listDirectives
  }
  const quoteRanges = getQuoteRanges(simplifiedText)
  const textWithoutQuotes = replaceQuotedTextWithSpaces(simplifiedText)
  const context = new TextParserContext(simplifiedText)
  let references = getExtractedReferences(context)
  if (quoteRanges.length > 0) {
    references = references.filter(
      (reference) => !isInsideQuoteRanges(reference.position, quoteRanges),
    )
  }
  if (references.length === 0) {
    const prefix = textWithoutQuotes.split(",")[0] ?? textWithoutQuotes
    references = getExtractedReferences(new TextParserContext(prefix))
  }
  if (references.length === 0) {
    const fallback = fallbackArticleReference(textWithoutQuotes)
    if (fallback) {
      references = [
        {
          ...fallback.reference,
          position: fallback.position,
        } satisfies TextAstReference,
      ]
    }
  }

  if (references.length === 1 && references[0]?.type === "article") {
    const portionedReference = buildPortionReferenceFromText(textWithoutQuotes)
    if (portionedReference) {
      references = [portionedReference]
    }
  }
  const directives: ActionDirective[] = []

  for (const reference of references) {
    if (reference.type === "reference_et_action") {
      const start = reference.position?.start ?? 0
      const sourcePosition: FragmentPosition = {
        start,
        stop: simplifiedText.length,
      }
      const sourceText = simplifiedText.slice(start)
      const directive = buildActionDirective({
        action: reference.action,
        reference: reference.reference,
        sourcePosition,
        sourceText,
        fullText: simplifiedText,
      })
      if (directive) {
        if (Array.isArray(directive)) {
          directives.push(...directive)
        } else {
          directives.push(directive)
        }
      }
      continue
    }

    const sourcePosition =
      reference.position ??
      ({
        start: 0,
        stop: simplifiedText.length,
      } satisfies FragmentPosition)
    const directive = buildActionDirective({
      action: { action: "modifier" },
      reference,
      sourcePosition,
      sourceText: simplifiedText,
      fullText: simplifiedText,
    })
    if (directive) {
      if (Array.isArray(directive)) {
        directives.push(...directive)
      } else {
        directives.push(directive)
      }
    }
  }

  if (directives.length === 0) {
    const fallback = fallbackArticleReference(textWithoutQuotes)
    if (fallback) {
      const directive = buildActionDirective({
        action: { action: "modifier" },
        reference: fallback.reference,
        sourcePosition: fallback.position,
        sourceText: simplifiedText,
        fullText: simplifiedText,
      })
      if (directive) {
        if (Array.isArray(directive)) {
          directives.push(...directive)
        } else {
          directives.push(directive)
        }
      }
    }
  }

  return directives
}

export function extractActionDirectivesFromText(
  text: string,
): ActionDirective[] {
  return extractActionDirectivesFromTextInternal(text, {
    allowListExtraction: true,
  })
}

function isActionLineIntroducingCitation(line: string): boolean {
  const normalized = normalizeActionText(line)
  if (normalized.includes("«") || normalized.includes("»")) {
    return false
  }
  if (!line.trim().endsWith(":")) {
    return false
  }
  return /\b(remplace|modifie|redige|rediges|redigee|redigees)\b/.test(
    normalized,
  )
}

function collectCitationLines(
  lines: string[],
  startIndex: number,
): { combinedText: string; endIndex: number } | null {
  const citationLines: string[] = []
  let foundOpening = false
  let index = startIndex + 1
  while (index < lines.length) {
    const line = lines[index]
    const normalizedLine = stripLineLeader(line)
    if (!foundOpening && normalizedLine.includes("«")) {
      foundOpening = true
    }
    if (foundOpening) {
      citationLines.push(normalizedLine)
      if (normalizedLine.includes("»")) {
        break
      }
    } else if (normalizedLine.trim().length > 0) {
      // No opening quote found before another non-empty line -> stop.
      break
    }
    index += 1
  }
  if (!foundOpening || citationLines.length === 0) return null
  return {
    combinedText: [stripLineLeader(lines[startIndex]), ...citationLines].join(
      "\n",
    ),
    endIndex: index,
  }
}

export function extractActionDirectivesFromHtml(
  html: string,
): ActionDirective[] {
  const simplified = simplifyHtml()(html)
  const lines = simplified.output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const directives: ActionDirective[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    if (isActionLineIntroducingCitation(line)) {
      const citationBlock = collectCitationLines(lines, i)
      if (citationBlock) {
        const blockDirectives = extractActionDirectivesFromText(
          citationBlock.combinedText,
        )
        if (blockDirectives.length > 0) {
          directives.push(...blockDirectives)
          i = citationBlock.endIndex
          continue
        }
      }
    }

    const lineDirectives = extractActionDirectivesFromTextInternal(line, {
      allowListExtraction: false,
    })
    if (lineDirectives.length > 0) {
      directives.push(...lineDirectives)
    }
  }

  return directives
}
