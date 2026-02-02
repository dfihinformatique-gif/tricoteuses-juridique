import { marked } from "marked"

/**
 * Parse le Markdown en HTML de manière sécurisée
 *
 * @param markdown - Le texte Markdown à parser
 * @returns Le HTML généré
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown) return ""

  // Configuration de marked pour la sécurité
  marked.setOptions({
    breaks: true, // Convertir les retours à la ligne en <br>
    gfm: true, // GitHub Flavored Markdown
  })

  // Parser le Markdown
  const html = marked.parse(markdown)

  // Retourner le HTML (Svelte s'occupera du sanitizing avec {@html})
  return typeof html === "string" ? html : String(html)
}

/**
 * Extrait le texte brut d'un Markdown (sans le HTML)
 *
 * @param markdown - Le texte Markdown
 * @returns Le texte brut sans formatage
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return ""

  // Parser puis retirer les tags HTML
  const html = parseMarkdown(markdown)
  return html.replace(/<[^>]*>/g, "").trim()
}

/**
 * Tronque un texte Markdown à une longueur donnée
 *
 * @param markdown - Le texte Markdown
 * @param maxLength - Longueur maximale
 * @returns Le texte tronqué
 */
export function truncateMarkdown(
  markdown: string,
  maxLength: number = 150,
): string {
  const plainText = markdownToPlainText(markdown)
  if (plainText.length <= maxLength) return plainText

  return plainText.substring(0, maxLength).trim() + "..."
}
