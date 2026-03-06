import { describe, expect, test } from "vitest"

import {
  buildArticlePortionTreeFromHtml,
  extractPortionSelectors,
  resolvePortionSelector,
  type ArticlePortionAlinea,
} from "./article_portions.js"
import { getExtractedReferences } from "./references.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"

describe("article portion selectors", () => {
  test("resolves nested portion selector within an article", () => {
    const html = `
      <p>II. Chapitre II.</p>
      <p>A. Sous-section A.</p>
      <p>Premier alinéa du A.</p>
      <p>Deuxième alinéa du A.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au deuxième alinéa du A du II de l'article 5",
    )
    const references = getExtractedReferences(context)
    expect(references.length).toBeGreaterThan(0)

    const selectors = extractPortionSelectors(references[0])
    expect(selectors).toHaveLength(1)

    const match = resolvePortionSelector(article, selectors[0])
    expect(match).not.toBeNull()
    if (!match || !("node" in match)) {
      throw new Error("Expected a resolved node")
    }

    const node = match.node as ArticlePortionAlinea
    expect(node.type).toBe("alinéa")
    expect(node.text).toContain("Deuxième alinéa du A.")
  })

  test("resolves item selector when item prefix has no space after dash", () => {
    const html = `
      <p>II.- Champ d'application.</p>
      <p>Premier alinéa.</p>
      <p>Deuxième alinéa.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au deuxième alinéa du II de l'article 1",
    )
    const references = getExtractedReferences(context)
    expect(references.length).toBeGreaterThan(0)

    const selectors = extractPortionSelectors(references[0])
    expect(selectors).toHaveLength(1)

    const match = resolvePortionSelector(article, selectors[0])
    expect(match).not.toBeNull()
    if (!match || !("node" in match)) {
      throw new Error("Expected a resolved node")
    }

    const node = match.node as ArticlePortionAlinea
    expect(node.type).toBe("alinéa")
    // L'alinéa portant le libellé de l'item compte comme premier alinéa.
    expect(node.text).toContain("Premier alinéa")
  })

  test("resolves division-based selector within an article", () => {
    const html = `
      <p>Paragraphe II</p>
      <p>A. Sous-section A.</p>
      <p>Premier alinéa du A.</p>
      <p>Deuxième alinéa du A.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au deuxième alinéa du A du paragraphe II de l'article 5",
    )
    const references = getExtractedReferences(context)
    expect(references.length).toBeGreaterThan(0)

    const selectors = extractPortionSelectors(references[0])
    expect(selectors).toHaveLength(1)

    const match = resolvePortionSelector(article, selectors[0])
    expect(match).not.toBeNull()
    if (!match || !("node" in match)) {
      throw new Error("Expected a resolved node")
    }

    const node = match.node as ArticlePortionAlinea
    expect(node.type).toBe("alinéa")
    expect(node.text).toContain("Deuxième alinéa du A.")
  })

  test("resolves last alinea across nested items", () => {
    const html = `
      <p>II.- Dispositions.</p>
      <p>1° Premier élément.</p>
      <p>2° Deuxième élément.</p>
      <p>Dernier alinéa après liste.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au dernier alinéa du II de l'article 1",
    )
    const references = getExtractedReferences(context)
    expect(references.length).toBeGreaterThan(0)

    const selectors = extractPortionSelectors(references[0])
    expect(selectors).toHaveLength(1)

    const match = resolvePortionSelector(article, selectors[0])
    expect(match).not.toBeNull()
    if (!match || !("node" in match)) {
      throw new Error("Expected a resolved node")
    }

    const node = match.node as ArticlePortionAlinea
    expect(node.type).toBe("alinéa")
    expect(node.text).toContain("Dernier alinéa après liste")
  })

  test("resolves selector for III bis item", () => {
    const html = `
      <p>III bis.-Le montant annuel est plafonné.</p>
      <p>1. Premier alinéa du 1.</p>
      <p>Deuxième alinéa du 1.</p>
      <p>Troisième alinéa du 1.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au troisième alinéa du 1 du III bis de l'article 46",
    )
    const references = getExtractedReferences(context)
    expect(references.length).toBeGreaterThan(0)

    const selectors = extractPortionSelectors(references[0])
    expect(selectors).toHaveLength(1)

    const match = resolvePortionSelector(article, selectors[0])
    expect(match).not.toBeNull()
    if (!match || !("node" in match)) {
      throw new Error("Expected a resolved node")
    }

    const node = match.node as ArticlePortionAlinea
    expect(node.type).toBe("alinéa")
    expect(node.text).toContain("Troisième alinéa du 1.")
  })
})
