import {
  extractPortionSelectors,
  type PortionSelector,
} from "$lib/extractors/article_portions.js"
import { getExtractedReferences } from "$lib/extractors/references.js"
import type {
  ActionTarget,
  TextAstAction,
  TextAstArticle,
  TextAstCitation,
  TextAstReference,
} from "$lib/text_parsers/ast.js"
import {
  actionTargetFromReference,
  addChildLeftToLastChild,
} from "$lib/text_parsers/helpers.js"
import type { FragmentPosition } from "$lib/text_parsers/fragments.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  citation,
  convertCitationToText,
} from "$lib/text_parsers/citations.js"
import { article } from "$lib/text_parsers/articles.js"
import { portion } from "$lib/text_parsers/portions.js"
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
  | { kind: "insert_after" | "insert_before"; targetText: string; insertText: string }
  | { kind: "replace_portion"; replacementText: string }
  | { kind: "replace"; targetText: string; replacementText: string }
  | { kind: "delete"; targetText: string }
  | { kind: "delete_article" }

function normalizeActionText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function stripLineLeader(line: string): string {
  return line
    .replace(/^\s*(\d+)\s*(?:°|\.|\))\s*/u, "")
    .replace(/^\s*[a-zA-Z]\s*\)\s*/u, "")
    .replace(/^\s*[IVXLCDM]+\s*(?:\.|–|-)\s*/u, "")
}

type LineWithOffset = {
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
  return (
    /^\s*\d+\s*°/u.test(line) ||
    /^\s*[a-zA-Z]\s*\)/u.test(line)
  )
}

function isListBlockIntroLine(line: string): boolean {
  if (!line.trim().endsWith(":")) return false
  const normalized = normalizeActionText(line)
  return /\bainsi\s+modifie/.test(normalized)
}

function findFirstActionIndex(text: string): number | null {
  const match = /\b(inséré|insere|ajouté|ajoute|remplacé|remplace|supprimé|supprime|abrogé|abroge|complété|complete)\b/i.exec(
    text,
  )
  return match?.index ?? null
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
    .sort(
      (a, b) => (a.position?.start ?? 0) - (b.position?.start ?? 0),
    )
  return candidates[0] ?? null
}

function extractListItemDirectives(
  text: string,
): ActionDirective[] | null {
  const lines = splitLinesWithOffsets(text)
  const introIndex = lines.findIndex((line) =>
    isListBlockIntroLine(line.text),
  )
  if (introIndex === -1) return null

  const articleReference = pickArticleReference(lines[introIndex]?.text ?? "")
  if (!articleReference) return null

  type ItemBlock = { lines: LineWithOffset[]; start: number; end: number }
  const items: ItemBlock[] = []
  let current: ItemBlock | null = null

  for (let i = introIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line) continue
    if (isListItemStart(line.text)) {
      if (current) items.push(current)
      current = { lines: [line], start: line.start, end: line.end }
      continue
    }
    if (current) {
      current.lines.push(line)
      current.end = line.end
    }
  }
  if (current) items.push(current)
  if (items.length === 0) return null

  const directives: ActionDirective[] = []
  for (const item of items) {
    const itemLines = item.lines.map((line) => line.text)
    if (itemLines.length === 0) continue
    itemLines[0] = stripLineLeader(itemLines[0] ?? "")
    const itemText = itemLines.join("\n").trim()
    if (!itemText) continue

    const portionReference = pickPortionReferenceForItem(itemText)
    const reference = portionReference
      ? addChildLeftToLastChild(articleReference, portionReference)
      : articleReference
    const directive = buildActionDirective({
      action: { action: "MODIFICATION" },
      reference,
      sourcePosition: { start: item.start, stop: item.end },
      sourceText: itemText,
    })
    if (directive) directives.push(directive)
  }

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

function extractQuotedTexts(text: string): string[] {
  const results: string[] = []
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
    results.push(normalizeQuotedText(transformed.output))
    const nextOffset = parsed.position?.stop ?? start + 1
    offset = Math.max(nextOffset, start + 1)
  }
  return results
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

function extractPortionReferenceFromPrefix(
  prefix: string,
  prefixOffset: number,
): TextAstReference | null {
  const cleaned = trimTrailingArticleIntro(prefix)
  if (!cleaned) return null

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

function buildPortionReferenceFromText(
  text: string,
): TextAstReference | null {
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
  quoteSourceText: string = text,
): ParsedActionKind | null {
  const normalized = normalizeActionText(text)
  const quoted = extractQuotedTexts(quoteSourceText)
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
  const isInsert = /\binsere\b|\bajoute\b|\bajoutee\b|\bajoutes\b|\bajoutees\b|\bcomplete\b/.test(
    normalized,
  )
  const isReplace = /\bremplace\b|\bremplacee\b|\bremplaces\b|\bremplacees\b/.test(
    normalized,
  )
  const isDelete = /\bsupprime\b|\bsupprimee\b|\bsupprimes\b|\bsupprimees\b|\babroge\b|\babrogee\b|\babroges\b|\babrogees\b/.test(
    normalized,
  )

  if (action.action === "SUPPRESSION" || isDelete) {
    if (targetType === "article" && quoted.length === 0) {
      return { kind: "delete_article" }
    }
    if (quoted.length >= 1) {
      return { kind: "delete", targetText: quoted[0] }
    }
    return null
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
}): ActionDirective | null {
  const targetType = action.target ?? actionTargetFromReference(reference)
  const portionSelectors = extractPortionSelectors(reference)
  const quoteSourceText =
    fullText && sourcePosition.start < fullText.length
      ? fullText.slice(sourcePosition.start)
      : sourceText
  const parsed = parseActionFromText(
    sourceText,
    action,
    targetType,
    quoteSourceText,
  )
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
    case "delete":
      return {
        kind: "delete",
        targetType,
        reference,
        portionSelectors,
        targetText: parsed.targetText,
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
  const match = /\barticle\s+([0-9]+(?:-[0-9]+)?(?:\s*[A-Z])?(?:\s+[a-z]+)?)\b/i.exec(
    text,
  )
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

  if (
    references.length === 1 &&
    references[0]?.type === "article"
  ) {
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
      if (directive) directives.push(directive)
      continue
    }

    const sourcePosition =
      reference.position ?? ({
        start: 0,
        stop: simplifiedText.length,
      } satisfies FragmentPosition)
    const directive = buildActionDirective({
      action: { action: "MODIFICATION" },
      reference,
      sourcePosition,
      sourceText: simplifiedText,
      fullText: simplifiedText,
    })
    if (directive) directives.push(directive)
  }

  if (directives.length === 0) {
    const fallback = fallbackArticleReference(textWithoutQuotes)
    if (fallback) {
      const directive = buildActionDirective({
        action: { action: "MODIFICATION" },
        reference: fallback.reference,
        sourcePosition: fallback.position,
        sourceText: simplifiedText,
        fullText: simplifiedText,
      })
      if (directive) directives.push(directive)
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
    combinedText: [stripLineLeader(lines[startIndex]), ...citationLines].join("\n"),
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
