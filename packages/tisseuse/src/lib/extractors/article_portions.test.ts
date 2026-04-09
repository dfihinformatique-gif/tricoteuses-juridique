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

  test("resolves nested numeric and alpha items without confusing same local index", () => {
    const html = `
      <p>d. Bloc précédent.</p>
      <p>e. Sous-item parasite.</p>
      <p>5. a. Les revenus provenant de traitements publics et privés.</p>
      <p>Les pensions et retraites font l'objet d'un abattement de 10 %.</p>
      <p>L'abattement indiqué au deuxième alinéa ne peut être inférieur à 450 €.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "à la première phrase du deuxième alinéa du a du 5 de l'article 158",
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
    expect(node.text).toContain("Les pensions et retraites")
  })

  test("does not confuse 5 with 5° when both exist", () => {
    const html = `
      <p>d. Préambule.</p>
      <p>5° (Abrogé.)</p>
      <p>5. a. Les revenus provenant de traitements publics et privés.</p>
      <p>Les pensions et retraites font l'objet d'un abattement de 10 %.</p>
      <p>L'abattement indiqué au deuxième alinéa ne peut être inférieur à 450 €.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "à la première phrase du deuxième alinéa du a du 5 de l'article 158",
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
    expect(node.text).toContain("Les pensions et retraites")
  })

  test("resolves nested degree items under a numeric introductory item", () => {
    const html = `
      <p>I. – Le crédit d'impôt s'applique également :</p>
      <p>4. Pour certaines opérations :</p>
      <p>1° Aux premières opérations ;</p>
      <p>2° Aux secondes opérations lorsque les conditions suivantes sont réunies :</p>
      <p>a) Le contrat est conclu pour une durée au moins égale à cinq ans ;</p>
      <p>b) L'entreprise respecte les conditions prévues par décret ;</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "au a du 2° du 4 du I de l'article 244 quater W",
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

    expect(match.node.type).toBe("item")
    expect("children" in match.node).toBe(true)
    if (!("children" in match.node)) {
      throw new Error("Expected an item node with children")
    }
    const firstAlinea = match.node.children[0]
    expect(firstAlinea?.type).toBe("alinéa")
    expect((firstAlinea as ArticlePortionAlinea | undefined)?.text).toContain(
      "Le contrat est conclu",
    )
  })

  test("resolves compact nested item prefixes without spaces", () => {
    const html = `
      <p>I.-A.-1. Première partie du A.</p>
      <p>2. La réduction d'impôt ne s'applique pas aux investissements portant sur :</p>
      <p>1° L'acquisition de véhicules de tourisme qui ne sont pas strictement indispensables. Toutefois, la réduction d'impôt s'applique aux investissements consistant en l'acquisition de véhicules de tourisme mentionnés à la troisième phrase du quinzième alinéa du I de l'article 199 undecies B ;</p>
      <p>2° Des installations particulières.</p>
    `
    const article = buildArticlePortionTreeFromHtml(html)
    const context = new TextParserContext(
      "à la seconde phrase du 1° du 2 du A du I de l'article 244 quater Y",
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
    expect(node.text).toContain("Toutefois")
    expect(node.text).toContain("troisième phrase")
  })
})
