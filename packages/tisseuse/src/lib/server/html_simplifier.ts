import * as cheerio from "cheerio"
import type { Element } from "domhandler"
import * as crypto from "node:crypto"

import { alineaNumberByImageHash } from "../alineas/alineas_numbers"

/**
 * CSS styles for alinea markers (inline to be self-contained)
 */
const ALINEA_STYLES = `
p:has(.alinea) {
  margin: 0.6em 0;
}
.alinea {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0 0.3em;
  margin-right: 0.3em;
  font-size: 0.75em;
  font-weight: bold;
  color: #555;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 1em;
  vertical-align: middle;
}
`

const HEADING_STYLES = `
h1 {
  font-size: 1.8em;
  margin: 1em 0 0.5em 0;
}
h2 {
  font-size: 1.5em;
  margin: 0.9em 0 0.4em 0;
}
h3 {
  font-size: 1.3em;
  margin: 0.8em 0 0.4em 0;
}
h4 {
  font-size: 1.15em;
  margin: 0.7em 0 0.3em 0;
}
h5 {
  font-size: 1.05em;
  margin: 0.6em 0 0.3em 0;
}
h6 {
  font-size: 1em;
  margin: 0.5em 0 0.3em 0;
}
`

const EXPOSE_MOTIFS_STYLES = `
.expose-motifs-titre {
  font-size: 1.1em;
  font-weight: bold;
  color: #0070b9;
  margin: 1em 0 0.5em 0;
}
.expose-motifs {
  border-left: 3px solid #0070b9;
  padding-left: 1em;
  margin: 0.5em 0 1em 0;
  color: #333;
}
.expose-motifs p {
  margin: 0.5em 0;
}
`

const LIST_STYLES = `
ol {
  list-style: none;
  padding-left: 0;
  margin: 0.5em 0;
  counter-reset: list-counter;
}
ol > li {
  counter-increment: list-counter;
  margin: 0.3em 0;
  padding-left: 2.3em;
  position: relative;
}
ol > li::before {
  content: counter(list-counter);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0 0.3em;
  font-size: 0.75em;
  font-weight: bold;
  color: #555;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 1em;
  position: absolute;
  left: 0;
  top: 0.1em;
}
`

const COVER_PAGE_STYLES = `
.cover-title {
  font-size: 1.8em;
  font-weight: bold;
  color: #0070b9;
  text-align: center;
  margin: 1em 0;
}
.cover-subtitle {
  font-size: 1.4em;
  font-weight: bold;
  color: #0070b9;
  text-align: center;
  margin: 0.8em 0;
}
.cover-info {
  text-align: center;
  margin: 0.3em 0;
  color: #333;
}
.cover-year {
  font-size: 2em;
  font-weight: bold;
  color: #0070b9;
  text-align: center;
  margin: 1em 0;
}
`

/**
 * CSS classes that imply formatting (bold and/or alignment)
 * These classes are used in tables and other elements where the formatting is defined
 * at the class level, not inline.
 */
interface ClassStyle {
  bold?: boolean
  align?: "left" | "center" | "right"
}

const CLASS_STYLES: Record<string, ClassStyle> = {
  // État tables - bold only (left aligned by default)
  assnatetatagr: { bold: true },
  assnatetatagrgr: { bold: true },
  assnatetatatr: { bold: true },
  // État tables - bold + right aligned (suffix M = right)
  assnatetatagrM: { bold: true, align: "right" },
  assnatetatagrgrM: { bold: true, align: "right" },
  assnatetatatrM: { bold: true, align: "right" },
  // Ligne tables
  "assnatligne-etatG-Obj": { bold: true },
  assnatligneTequilibre: { bold: true, align: "right" },
  assnatligneTequilibre2: { bold: true, align: "right" },
  assnatligneTequilibreg: { bold: true },
  assnatligneTequilibreg2: { bold: true },
  // Équilibre
  assnatligneequilibrec7: { bold: true, align: "center" },
  assnatligneequilibred7: { bold: true, align: "right" },
  assnatligneequilibreg: { bold: true },
  // SCSD
  assnatscsd: { bold: true },
  assnatscsdM: { bold: true, align: "right" },
  // Solde
  assnatsoldeEquil: { bold: true, align: "right" },
  assnatsoldeEquil2: { bold: true, align: "right" },
  assnatsoldeMiss: { bold: true, align: "right" },
  // Table lignes
  "assnattable-ligneD-Gras": { bold: true, align: "right" },
  "assnattable-ligneD-T": { bold: true, align: "right" },
  "assnattable-ligneG-Gras": { bold: true },
  "assnattable-ligneG-T": { bold: true },
  // Titres
  assnattitreEquil: { bold: true, align: "center" },
  assnattitreEquil2: { bold: true, align: "center" },
  assnattitrelolf: { bold: true, align: "center" },
  assnattypeMiss: { bold: true },
  // XL
  assnatxl68: { bold: true },
  assnatxl71: { bold: true, align: "right" },
  // Other
  assnatTableHeading: { bold: true, align: "center" },
  assnatFAR09NoirTitre: { bold: true },
  assnatTOC1: { bold: true },

  // Alignment only (no bold) - right aligned
  assnatetatalrM2: { align: "right" }, // also italic, but we don't handle that
  assnatetatalrM: { align: "right" },
  assnatligneadeduireequilibre: { align: "right" }, // also italic
  assnatligneequilibre: { align: "right" },
  "assnattable-ligneD": { align: "right" },
  "assnattable-unite": { align: "right" }, // also italic
  assnatxl70: { align: "right" }, // also italic
  assnatxl72: { align: "right" },

  // Alignment only (no bold) - center aligned
  assnatetatalrC: { align: "center" },
  "assnattable-entete2": { align: "center" },
  "assnattable-entete": { align: "center" },
  assnatxl67: { align: "center" },
  assnatenteteequilibre: { align: "center" },
}

/**
 * Gets the style implied by a class name
 * Classes are sorted by length (longest first) to match more specific classes first
 * e.g., "assnatetatagrM" should match before "assnatetatagr"
 */
function getClassStyle(className: string): ClassStyle | null {
  // Sort keys by length descending to match longer (more specific) classes first
  const sortedClasses = Object.keys(CLASS_STYLES).sort(
    (a, b) => b.length - a.length,
  )
  for (const cls of sortedClasses) {
    if (className.includes(cls)) {
      return CLASS_STYLES[cls]
    }
  }
  return null
}

/**
 * Computes MD5 hash of a string (used for image base64 data)
 */
function computeHash(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex")
}

/**
 * Options for HTML simplification
 */
export interface SimplifyHtmlOptions {
  /** Keep align attribute on paragraphs (default: true) */
  keepAlignment?: boolean
  /** Remove empty paragraphs (default: true) */
  removeEmptyParagraphs?: boolean
  /** Throw error if an alinea image hash is missing from mapping (default: false) */
  strictAlineas?: boolean
}

/**
 * Checks if a style attribute contains bold formatting
 */
function isBold(style: string | undefined): boolean {
  if (!style) return false
  return (
    /font-weight\s*:\s*(bold|[6-9]00|1000)/i.test(style) ||
    /font-family\s*:\s*[^;]*\bBold\b/i.test(style)
  )
}

/**
 * Checks if a style attribute contains italic formatting
 */
function isItalic(style: string | undefined): boolean {
  if (!style) return false
  return (
    /font-style\s*:\s*italic/i.test(style) ||
    /font-family\s*:\s*[^;]*\bItalic\b/i.test(style)
  )
}

/**
 * Checks if a style attribute indicates superscript
 * Note: We exclude very small font sizes used just for spacing in Word documents
 */
function isSuperscript(style: string | undefined): boolean {
  if (!style) return false
  // Check for vertical-align: super
  if (!/vertical-align\s*:\s*super/i.test(style)) return false
  // Exclude tiny font sizes that are just used for spacing (e.g., font-size:6.67pt)
  const fontSizeMatch = style.match(/font-size\s*:\s*([\d.]+)pt/i)
  if (fontSizeMatch && parseFloat(fontSizeMatch[1]) < 8) {
    return false
  }
  return true
}

/**
 * Checks if a style attribute indicates subscript
 */
function isSubscript(style: string | undefined): boolean {
  if (!style) return false
  return /vertical-align\s*:\s*sub/i.test(style)
}

/**
 * Extracts and keeps only table-relevant styles from a style attribute
 * Keeps: width, border*, padding, margin, vertical-align, text-align, background-color
 */
function cleanTableStyle(style: string | undefined): string | undefined {
  if (!style) return undefined

  const keepProperties = [
    "width",
    "height",
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-collapse",
    "border-spacing",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "vertical-align",
    "text-align",
    "background-color",
    "background",
  ]

  const cleanedProperties: string[] = []

  // Parse style string into individual properties
  const properties = style
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p)

  for (const prop of properties) {
    const colonIndex = prop.indexOf(":")
    if (colonIndex === -1) continue

    const name = prop.substring(0, colonIndex).trim().toLowerCase()
    const value = prop.substring(colonIndex + 1).trim()

    // Check if this property should be kept
    if (
      keepProperties.some(
        (keep) => name === keep || name.startsWith(keep + "-"),
      )
    ) {
      cleanedProperties.push(`${name}:${value}`)
    }
  }

  return cleanedProperties.length > 0 ? cleanedProperties.join("; ") : undefined
}

/**
 * Checks if a style or class indicates centered text
 */
function isCentered(
  style: string | undefined,
  className: string | undefined,
): boolean {
  if (style && /text-align\s*:\s*center/i.test(style)) return true
  if (className && /center/i.test(className)) return true
  return false
}

/**
 * Gets the text alignment from style
 */
function getAlignment(style: string | undefined): string | null {
  if (!style) return null
  const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Check if an element represents a heading based on its class name
 */
function getHeadingLevel(className: string | undefined): number | null {
  if (!className) return null

  // Match patterns like assnat4TitreNum, assnat5ChapitreNum, etc.
  const patterns: Array<[RegExp, number]> = [
    [/assnat1Tome|assnatAN1PARTIE/i, 1],
    [/assnat2Partie|assnatAN2GRAND/i, 2],
    [/assnat3Livre|assnatAN3GRAND/i, 3],
    [/assnat4Titre|assnatAN4Petit/i, 4],
    [/assnat5Chapitre|assnatAN5Petit/i, 5],
    [
      /assnat6Section|assnat7Sous-section|assnat8Paragraphe|assnat9ArticleNum/i,
      6,
    ],
  ]

  for (const [pattern, level] of patterns) {
    if (pattern.test(className)) {
      return level
    }
  }

  return null
}

/**
 * Simplifies Word-generated HTML to clean, semantic HTML
 *
 * This function takes complex HTML generated by Word (typically from Assemblée nationale documents)
 * and converts it to simple, clean HTML with only essential semantic elements:
 * - <p> for paragraphs
 * - <strong> for bold text
 * - <em> for italic text
 * - <sup> for superscript
 * - <sub> for subscript
 * - <br> for line breaks
 * - <h1> to <h6> for headings
 * - <a> for links (href preserved)
 *
 * @param html - The input HTML string (Word-generated)
 * @param options - Options for simplification
 * @returns Simplified HTML string
 */
export function simplifyWordHtml(
  html: string,
  options: SimplifyHtmlOptions = {},
): string {
  const {
    keepAlignment = true,
    removeEmptyParagraphs = true,
    strictAlineas = false,
  } = options

  const $ = cheerio.load(html, {
    xml: {
      decodeEntities: false,
    },
  })

  // Remove style and script elements
  $("style, script, meta, link").remove()

  // Remove header, footer, and page-break related elements
  $(
    ".assnatHeader, .assnatFooter, .assnatHeaderLeft, .assnatHeaderandFooter",
  ).remove()
  $(
    ".assnatFARSautApres, .assnatFARSautAvant, .assnatFARSautPageNiv0, .assnatFARSautPageNiv1, .assnatFARSautPageNiv1PG",
  ).remove()

  // Remove page header tables (tables containing assnatFARTT08Bleu class - page title with page number)
  $(".assnatFARTT08Bleu").each((_, el) => {
    // Find the parent table and remove it
    const $table = $(el).closest("table")
    if ($table.length > 0) {
      $table.remove()
    }
  })

  // Unwrap styling tables that contain article titles
  // These tables have a single row with a single cell containing a heading (h1-h6)
  // They are used only for visual styling (borders) and should be replaced by their content
  $("table").each((_, table) => {
    const $table = $(table)
    const $rows = $table.find("> tbody > tr, > tr")

    // Only process tables with exactly one row
    if ($rows.length !== 1) {
      return
    }

    const $cells = $rows.find("> td, > th")

    // Only process rows with exactly one cell
    if ($cells.length !== 1) {
      return
    }

    const $cell = $cells.first()
    const $headings = $cell.find("h1, h2, h3, h4, h5, h6")

    // Check if the cell contains a heading (article title)
    if ($headings.length > 0) {
      // Check if the cell style indicates it's a styling table (has border styling)
      const cellStyle = $cell.attr("style") || ""
      if (
        cellStyle.includes("border-left:") ||
        cellStyle.includes("border-bottom:")
      ) {
        // Replace the table with the cell's content
        $table.replaceWith($cell.html() || "")
      }
    }
  })

  // Remove br elements with page-break styles
  $('br[style*="page-break"]').remove()

  // Remove large background/watermark images with z-index:-65537 before processing
  // These are problematic images that should not be included in the simplified output
  // But preserve small images (< 50px) which are alinea markers
  $('span[style*="position:absolute"][style*="z-index:-65537"]').each(
    (_, span) => {
      const $span = $(span)
      const $img = $span.find("img")

      if ($img.length > 0) {
        const imgWidth = parseInt($img.attr("width") || "0", 10)
        const imgHeight = parseInt($img.attr("height") || "0", 10)

        // Only remove if the image is large (>= 50px in either dimension)
        // Small images are alinea markers and should be preserved
        if (imgWidth >= 50 || imgHeight >= 50) {
          $span.remove()
        }
      }
    },
  )

  // Process pastille images (alinea markers) before removing other images
  // These are small images positioned to the left that contain alinea numbers
  $('span[style*="position:absolute"]').each((_, span) => {
    const $span = $(span)
    const style = $span.attr("style") || ""
    const $img = $span.find("img")

    // Skip if no image found
    if ($img.length === 0) {
      return
    }

    // Skip pastilles where the image is inside <del> elements (deleted content)
    // The <del> can be either around the span or inside it wrapping the img
    if ($span.parents("del").length > 0 || $span.find("del img").length > 0) {
      return
    }

    // Also skip if the img itself is a direct child of del inside this span
    if ($img.parent("del").length > 0) {
      return
    }

    {
      const imgAttrs = $img.attr()

      // Check if this is a pastille image (small, positioned to the left)
      if (
        imgAttrs &&
        ((imgAttrs.width === "45" &&
          (imgAttrs.height === "31" || imgAttrs.height === "30")) ||
          (parseInt(imgAttrs.width || "0", 10) < 50 &&
            parseInt(imgAttrs.height || "0", 10) < 50)) &&
        style.includes("position:absolute")
      ) {
        // Extract image hash for validation
        const imgSrc = imgAttrs.src || ""
        const base64Match = imgSrc.match(/^data:image\/png;base64,(.+)$/)
        const imageHash = base64Match ? computeHash(base64Match[1]) : undefined

        // Replace the span with a temporary placeholder
        // We'll replace these with correct relative numbers after processing headings
        const hashAttr = imageHash ? ` data-image-hash="${imageHash}"` : ""
        $span.replaceWith(`<span class="alinea"${hashAttr}></span>`)
        return
      }
    }
  })

  // Process remaining spans that might need cleanup
  $('span[style*="position:absolute"]').each((_, span) => {
    const $span = $(span)
    const style = $span.attr("style") || ""
    const $img = $span.find("img")

    // Check if this span only contains an image and should be removed
    if (
      $img.length > 0 &&
      $span.children().length === 1 &&
      style.includes("height:0pt")
    ) {
      // Check if the image is small (layout/pastille) or large (cover page illustration)
      const imgWidth = parseInt($img.attr("width") || "0", 10)
      const imgHeight = parseInt($img.attr("height") || "0", 10)

      // Only remove if the image is small (< 100px in either dimension)
      // Large images (like cover page illustrations) should be preserved
      if (imgWidth < 100 || imgHeight < 100) {
        // This is likely a layout span with a small image, remove it
        $span.remove()
      } else {
        // Large image - unwrap from the span but keep the image
        $span.replaceWith($img)
      }
    }
  })

  // Remove small images (logos, icons) but keep large illustration images
  $("img").each((_, img) => {
    const $img = $(img)
    const width = parseInt($img.attr("width") || "0", 10)
    const height = parseInt($img.attr("height") || "0", 10)

    // Keep images that are large enough to be illustrations (> 100px in both dimensions)
    // Remove small images (logos, decorative elements, pastilles that weren't alinea markers)
    if (width < 100 || height < 100) {
      $img.remove()
    } else {
      // Clean up style attribute but keep src, width, height, alt
      $img.removeAttr("style").removeAttr("class")
    }
  })

  // Remove Word-specific elements that are just for layout
  // (pastille spans have already been processed above)
  $('span[style*="height:0pt"]:not(.alinea)').each((_, span) => {
    const $span = $(span)
    // Only remove if it doesn't contain meaningful content
    const text = $span.text().trim()
    if (!text || text === "\u00a0") {
      $span.remove()
    }
  })
  $(
    'span[style*="display:block"][style*="position:absolute"]:not(.alinea)',
  ).remove()
  $("del").remove()

  // Process all elements to extract formatting
  function processElement(el: Element): {
    bold: boolean
    italic: boolean
    sup: boolean
    sub: boolean
  } {
    const $el = $(el)
    const style = $el.attr("style")
    const tagName = el.tagName?.toLowerCase() || ""

    let bold = isBold(style) || tagName === "b" || tagName === "strong"
    let italic = isItalic(style) || tagName === "i" || tagName === "em"
    const sup = isSuperscript(style) || tagName === "sup"
    const sub = isSubscript(style) || tagName === "sub"

    // Check class for bold/italic hints
    const className = $el.attr("class") || ""
    if (/bold/i.test(className)) bold = true
    // assnatStrongEmphasis = bold, assnatEmphasis = italic
    if (/strongemphasis/i.test(className)) {
      bold = true
    } else if (/italic|emphasis/i.test(className)) {
      italic = true
    }

    return { bold, italic, sup, sub }
  }

  // Wrap content with appropriate tags based on formatting
  function wrapWithFormatting(
    content: string,
    formatting: { bold: boolean; italic: boolean; sup: boolean; sub: boolean },
  ): string {
    let result = content

    if (formatting.sup) {
      result = `<sup>${result}</sup>`
    } else if (formatting.sub) {
      result = `<sub>${result}</sub>`
    }

    if (formatting.italic) {
      result = `<em>${result}</em>`
    }

    if (formatting.bold) {
      result = `<strong>${result}</strong>`
    }

    return result
  }

  // Process span elements - extract formatting and replace with appropriate semantic tags
  // We need multiple passes since spans can be nested
  let spanCount = $("span").length
  while (spanCount > 0) {
    $("span").each((_, span) => {
      const $span = $(span)
      const style = $span.attr("style") || ""
      const className = $span.attr("class") || ""
      const formatting = processElement(span)
      const hasFormatting =
        formatting.bold || formatting.italic || formatting.sup || formatting.sub

      // Check if this is a "spacing" span (tiny superscript used just for spacing)
      const isSpacingSpan =
        /vertical-align\s*:\s*super/i.test(style) &&
        /font-size\s*:\s*([\d.]+)pt/i.test(style) &&
        parseFloat(
          (style.match(/font-size\s*:\s*([\d.]+)pt/i) || ["", "12"])[1],
        ) < 8

      // Check if this span has a meaningful class (like leaderText) that we should preserve
      const hasMeaningfulClass = className && !/^assnat/i.test(className)

      // Check if this span has an id attribute (should be preserved for later hoisting)
      const hasId = $span.attr("id")

      if (isSpacingSpan) {
        // Replace with the content (usually nbsp) without any formatting
        const innerHtml = $span.html() || ""
        $span.replaceWith(innerHtml)
      } else if (hasFormatting) {
        const innerHtml = $span.html() || ""
        $span.replaceWith(wrapWithFormatting(innerHtml, formatting))
      } else if (hasMeaningfulClass) {
        // Keep the span but remove style attribute
        $span.removeAttr("style")
      } else if (hasId) {
        // Keep the span with id for later hoisting, but remove style and class
        $span.removeAttr("style").removeAttr("class")
      } else {
        // No formatting and no meaningful class - unwrap the span
        // Preserve spaces by replacing empty spans with a space if they contain whitespace
        const innerHtml = $span.html() || ""
        if (innerHtml.trim() === "" && innerHtml.length > 0) {
          // Span contains only whitespace - preserve a single space
          $span.replaceWith(" ")
        } else {
          $span.replaceWith(innerHtml)
        }
      }
    })

    const newSpanCount = $("span").length
    if (newSpanCount >= spanCount) {
      // No progress made, break to avoid infinite loop
      break
    }
    spanCount = newSpanCount
  }

  // Process paragraphs - detect if they're actually headings or expose des motifs
  $("p").each((_, p) => {
    const $p = $(p)
    const className = $p.attr("class") || ""
    const style = $p.attr("style")
    const headingLevel = getHeadingLevel(className)

    // Check for cover page subtitle (assnatFARCouvTitreD) - must be checked before assnatFARCouvTitre
    if (className.includes("assnatFARCouvTitreD")) {
      const innerHtml = $p.html() || ""
      $p.replaceWith(`<p class="cover-subtitle">${innerHtml}</p>`)
      return
    }

    // Check for cover page title (assnatFARCouvTitre)
    if (className.includes("assnatFARCouvTitre")) {
      const innerHtml = $p.html() || ""
      $p.replaceWith(`<p class="cover-title">${innerHtml}</p>`)
      return
    }

    // Check for cover page info (assnatFPFprem)
    if (className.includes("assnatFPFprem")) {
      const innerHtml = $p.html() || ""
      $p.replaceWith(`<p class="cover-info">${innerHtml}</p>`)
      return
    }

    // Check for cover page year (assnatFARCouvAnnee)
    if (className.includes("assnatFARCouvAnnee")) {
      const innerHtml = $p.html() || ""
      $p.replaceWith(`<p class="cover-year">${innerHtml}</p>`)
      return
    }

    // Check for expose des motifs title
    if (className.includes("assnatFPFexpogentitre1")) {
      const innerHtml = $p.html() || ""
      $p.replaceWith(`<p class="expose-motifs-titre">${innerHtml}</p>`)
      return
    }

    // Check for expose des motifs text
    if (className.includes("assnatFPFexpogentexte")) {
      $p.removeAttr("style").attr("class", "expose-motifs-text")
      return
    }

    // Get the text content to check if it starts with « (quoted legislative text)
    // These are citations and should not be converted to headings
    const textContent = $p.text().trim()
    const startsWithQuote = textContent.startsWith("«")

    if (headingLevel && !startsWithQuote) {
      // Convert to heading (but not if it's quoted text)
      const innerHtml = $p.html() || ""
      const $heading = $(`<h${headingLevel}>${innerHtml}</h${headingLevel}>`)

      // Keep alignment if it's centered
      if (keepAlignment && isCentered(style, className)) {
        $heading.attr("align", "center")
      }

      $p.replaceWith($heading)
    } else {
      // Check if the class implies formatting (bold and/or alignment)
      const classStyle = getClassStyle(className)

      // Keep as paragraph, but extract alignment if needed
      // Priority: explicit style alignment > class-implied alignment
      let finalAlign: string | undefined
      if (keepAlignment) {
        const styleAlignment = getAlignment(style)
        if (
          styleAlignment &&
          styleAlignment !== "justify" &&
          styleAlignment !== "left"
        ) {
          finalAlign = styleAlignment
        } else if (classStyle?.align) {
          finalAlign = classStyle.align
        }
      }

      // Remove all other attributes
      $p.removeAttr("style").removeAttr("class")
      if (finalAlign) {
        $p.attr("align", finalAlign)
      }

      // Wrap content in <strong> if the class implied bold formatting
      if (classStyle?.bold) {
        const innerHtml = $p.html() || ""
        // Only wrap if not already wrapped in strong
        if (!innerHtml.trim().startsWith("<strong>")) {
          $p.html(`<strong>${innerHtml}</strong>`)
        }
      }
    }
  })

  // Process headings - clean attributes
  $("h1, h2, h3, h4, h5, h6").each((_, h) => {
    const $h = $(h)
    const style = $h.attr("style")
    const className = $h.attr("class")

    if (keepAlignment && isCentered(style, className)) {
      $h.removeAttr("style").removeAttr("class")
      $h.attr("align", "center")
    } else {
      $h.removeAttr("style").removeAttr("class")
    }
  })

  // Process links - keep only href, convert id-only anchors to spans
  $("a").each((_, a) => {
    const $a = $(a)
    const href = $a.attr("href")
    const id = $a.attr("id")

    // Remove all attributes except href and id
    const attribs = { ...((a as Element).attribs || {}) }
    for (const attr of Object.keys(attribs)) {
      if (attr !== "href" && attr !== "id") {
        $a.removeAttr(attr)
      }
    }

    // If no href and no id, unwrap the anchor
    if (!href && !id) {
      $a.replaceWith($a.html() || "")
    } else if (!href && id) {
      // Convert id-only anchors to spans for semantic correctness
      const innerHtml = $a.html() || ""
      $a.replaceWith(`<span id="${id}">${innerHtml}</span>`)
    }
  })

  // Process divs - unwrap them (Word uses divs for sections)
  // We need to do this iteratively since nested divs require multiple passes
  while ($("div").length > 0) {
    $("div").each((_, div) => {
      const $div = $(div)
      const innerHtml = $div.html() || ""
      $div.replaceWith(innerHtml)
    })
  }

  // Wrap expose des motifs text paragraphs in a container
  // Find sequences of .expose-motifs-text paragraphs preceded by .expose-motifs-titre
  $(".expose-motifs-titre").each((_, titre) => {
    const $titre = $(titre)
    const textsToWrap: cheerio.Cheerio<Element>[] = []

    // Collect all following siblings that are expose-motifs-text until we hit something else
    let $next = $titre.next()
    while ($next.length > 0) {
      // Check if it's a table containing expose-motifs-text (Word wraps these in tables)
      if ($next.is("table") && $next.find(".expose-motifs-text").length > 0) {
        // Extract the paragraphs from the table
        $next.find(".expose-motifs-text").each((_, p) => {
          textsToWrap.push($(p).clone())
        })
        const $toRemove = $next
        $next = $next.next()
        $toRemove.remove()
      } else if ($next.hasClass("expose-motifs-text")) {
        textsToWrap.push($next.clone())
        const $toRemove = $next
        $next = $next.next()
        $toRemove.remove()
      } else if (
        $next.is("ul, ol") &&
        $next.find(".expose-motifs-text").length > 0
      ) {
        // Lists containing expose-motifs-text items
        textsToWrap.push($next.clone())
        const $toRemove = $next
        $next = $next.next()
        $toRemove.remove()
      } else {
        break
      }
    }

    // Create wrapper div and insert after titre
    if (textsToWrap.length > 0) {
      const $wrapper = $('<div class="expose-motifs"></div>')
      textsToWrap.forEach(($el) => {
        $el.removeClass("expose-motifs-text")
        $wrapper.append($el)
      })
      $titre.after($wrapper)
    }
  })

  // Process br elements with page-break style - convert to simple br
  $("br").each((_, br) => {
    const $br = $(br)
    $br.removeAttr("style").removeAttr("class")
  })

  // Process tables - keep structure and important styling (borders, padding, etc.)
  $("table, tr, td, th, thead, tbody, tfoot").each((_, el) => {
    const $el = $(el)
    const style = $el.attr("style")
    const cleanedStyle = cleanTableStyle(style)

    $el.removeAttr("style").removeAttr("class")

    if (cleanedStyle) {
      $el.attr("style", cleanedStyle)
    }
  })

  // Merge td/th cells that contain only a single p element
  // This simplifies: <td><p align="right">text</p></td> to <td align="right">text</td>
  $("td, th").each((_, cell) => {
    const $cell = $(cell)
    const children = $cell.children()

    // Check if the cell contains exactly one child and it's a <p>
    if (children.length === 1 && children.first().is("p")) {
      const $p = children.first()

      // Check if the p is the only content (no text nodes outside)
      const cellHtml = $cell.html() || ""
      const pOuterHtml = $.html($p)
      if (cellHtml.trim() === pOuterHtml.trim()) {
        // Get the p's alignment if any
        const pAlign = $p.attr("align")
        const pId = $p.attr("id")

        // Replace cell content with p's inner content
        $cell.html($p.html() || "")

        // Transfer align attribute to cell if present and cell doesn't have one
        if (pAlign && !$cell.attr("align")) {
          $cell.attr("align", pAlign)
        }

        // Transfer id attribute to cell if present and cell doesn't have one
        if (pId && !$cell.attr("id")) {
          $cell.attr("id", pId)
        }
      }
    }
  })

  // Process lists - keep structure but remove Word styling (font-size, color, etc.)
  $("ol, ul").each((_, el) => {
    const $el = $(el)
    // Keep the start attribute for ordered lists and set counter-reset via inline style
    const start = $el.attr("start")
    $el.removeAttr("style").removeAttr("class")
    if (start) {
      const startNum = parseInt(start, 10)
      if (!isNaN(startNum) && startNum > 1) {
        // Set counter-reset to start - 1 so first li shows correct number
        $el.attr("style", `counter-reset: list-counter ${startNum - 1}`)
      }
      $el.attr("start", start)
    }
  })

  $("li").each((_, el) => {
    const $el = $(el)
    const style = $el.attr("style")
    const alignment = getAlignment(style)
    $el.removeAttr("style").removeAttr("class")

    // Preserve center alignment
    if (alignment === "center") {
      $el.attr("style", "text-align: center")
    }

    // Remove leading nbsp characters from list item content
    const html = $el.html() || ""
    const cleanedHtml = html.replace(/^(\s|&#xa0;|&#160;|\u00a0)+/, "")
    if (cleanedHtml !== html) {
      $el.html(cleanedHtml)
    }
  })

  // Hoist span ids to parent elements when appropriate
  hoistSpanIds($)

  // Recalculate alinea numbers using exclusively the alineaNumberByImageHash mapping
  recalculateAlineaNumbers($, strictAlineas)

  // Get the body content
  const bodyHtml = $("body").html() || $.html()

  // Check if there are any alinea markers or lists - if so, add the styles
  const hasAlineas = bodyHtml.includes('class="alinea')
  const hasLists = $("ol").length > 0

  // Check if there are any headings
  const hasHeadings = $("h1, h2, h3, h4, h5, h6").length > 0

  // Check if there are expose des motifs sections
  const hasExposeMotifs = bodyHtml.includes('class="expose-motifs')

  // Check if there are cover page elements
  const hasCoverPage =
    bodyHtml.includes('class="cover-title"') ||
    bodyHtml.includes('class="cover-subtitle"') ||
    bodyHtml.includes('class="cover-info"') ||
    bodyHtml.includes('class="cover-year"')

  let styles = ""
  if (hasCoverPage) {
    styles += COVER_PAGE_STYLES
  }
  if (hasHeadings) {
    styles += HEADING_STYLES
  }
  if (hasExposeMotifs) {
    styles += EXPOSE_MOTIFS_STYLES
  }
  if (hasAlineas) {
    styles += ALINEA_STYLES
  }
  if (hasLists) {
    styles += LIST_STYLES
  }

  let result = styles ? `<style>${styles}</style>\n${bodyHtml}` : bodyHtml

  // Clean up whitespace
  result = result
    // Remove excessive whitespace between tags
    .replace(/>\s+</g, "> <")
    // Normalize line breaks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim lines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")

  // Convert &nbsp; to non-breaking space character
  result = result.replace(/&nbsp;/g, "\u00a0")

  // Remove empty paragraphs if requested
  if (removeEmptyParagraphs) {
    // Remove paragraphs that contain only whitespace, nbsp, or empty formatting tags
    result = result
      .replace(/<p[^>]*>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/p>/gi, "")
      .replace(
        /<p[^>]*>\s*<(strong|em|b|i)>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/\1>\s*<\/p>/gi,
        "",
      )
  }

  // Remove empty spans
  result = result.replace(/<span[^>]*>\s*<\/span>/gi, "")

  // Remove empty class attributes
  result = result.replace(/ class=""/g, "")

  // Merge consecutive formatting tags
  result = mergeConsecutiveFormatting(result)

  // Final cleanup
  result = result
    // Remove empty formatting tags (including those with only whitespace/nbsp)
    .replace(
      /<(strong|em|b|i|sup|sub)>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/\1>/gi,
      "",
    )
    // Remove formatting tags that only contain nbsp
    .replace(/<(strong|em|b|i)>(&nbsp;|&#xa0;|&#160;|\u00a0)+<\/\1>/gi, " ")
    // Normalize self-closing tags
    .replace(/<br\s*\/?>/gi, "<br/>")
    // Clean up multiple consecutive spaces
    .replace(/  +/g, " ")
    .trim()

  return result
}

/**
 * Recalculates alinea numbers within each article
 * Articles are identified by h6 headings (converted from assnat9ArticleNum)
 *
 * Two modes are supported:
 * - Absolute mode (relativeNumbering=false): Uses the image hash to determine
 *   the alinea number from the original document. This preserves the legal
 *   structure where numbers may be non-sequential (e.g., 10 → 12) when
 *   referencing amended law articles.
 * - Relative mode (relativeNumbering=true): Numbers alineas sequentially
 *   within each article starting from 1. This is useful for simplified
 *   display where the original document's numbering is not needed.
 */
/**
 * Hoists id attributes from spans to their parent elements when the span
 * is the only meaningful child and only has an id attribute.
 *
 * This transforms:
 *   <p><span id="anchor">Text</span></p>
 * Into:
 *   <p id="anchor">Text</p>
 */
function hoistSpanIds($: cheerio.CheerioAPI): void {
  // Find all spans with id attribute
  $("span[id]").each((_, span) => {
    const $span = $(span)
    const id = $span.attr("id")

    // Check if span only has the id attribute (no class, style, etc.)
    const attribs = (span as Element).attribs || {}
    const attrKeys = Object.keys(attribs)
    if (attrKeys.length !== 1 || attrKeys[0] !== "id") {
      return // Has other attributes, skip
    }

    const $parent = $span.parent()
    if (!$parent.length) {
      return // No parent
    }

    const parentTagName = ($parent[0] as Element).tagName?.toLowerCase()
    // Only hoist to block-level elements
    if (
      !["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th"].includes(
        parentTagName,
      )
    ) {
      return
    }

    // Check if parent already has an id
    if ($parent.attr("id")) {
      return // Parent already has an id, don't overwrite
    }

    // Check if span is the only child of parent (ignoring whitespace)
    const parentHtml = $parent.html() || ""
    const spanOuterHtml = $.html($span)

    // Trim and compare - the span should be the only content
    if (parentHtml.trim() === spanOuterHtml.trim()) {
      // Hoist the id to parent and unwrap the span
      $parent.attr("id", id!)
      $span.replaceWith($span.html() || "")
    }
  })
}

function recalculateAlineaNumbers(
  $: cheerio.CheerioAPI,
  strictAlineas = false,
): void {
  // Get all elements in document order
  const body = $("body")
  if (body.length === 0) return

  // Find all alinea markers
  const allElements = body.find("span.alinea[data-image-hash]")

  // Track state for duplicate detection
  let lastAlineaNumber = -1

  allElements.each((_, el) => {
    const $el = $(el)

    // This is an alinea marker
    const imageHash = $el.attr("data-image-hash")

    let alineaNumber: number | undefined

    // Use exclusively the alineaNumberByImageHash mapping
    if (imageHash && alineaNumberByImageHash[imageHash] !== undefined) {
      alineaNumber = alineaNumberByImageHash[imageHash]
    }

    if (alineaNumber === undefined) {
      if (strictAlineas) {
        throw new Error(
          `Missing alinea number mapping for image hash: "${imageHash}". Please extract images, review them, and update the mapping in "src/lib/alineas/alineas_numbers.ts".`,
        )
      }
      // Unknown hash - remove the marker
      $el.remove()
      return
    }

    // Skip duplicates (same alinea number as previous, possibly from del/ins remnants)
    if (alineaNumber === lastAlineaNumber) {
      // Remove duplicate marker
      $el.remove()
      return
    }

    lastAlineaNumber = alineaNumber

    // Update the marker with the alinea number
    $el.attr("data-alinea", String(alineaNumber))

    // Add visible text content showing the alinea number
    $el.text(String(alineaNumber))

    // Clean up temporary attributes
    $el.removeAttr("data-image-hash")
  })
}

/**
 * Merge consecutive identical formatting tags
 * e.g., <strong>foo</strong><strong>bar</strong> -> <strong>foobar</strong>
 * Preserves spaces between tags
 */
function mergeConsecutiveFormatting(html: string): string {
  let result = html

  // Merge consecutive strong tags, preserving any space between them
  result = result.replace(/<\/strong>(\s*)<strong>/gi, "$1")

  // Merge consecutive em tags, preserving any space between them
  result = result.replace(/<\/em>(\s*)<em>/gi, "$1")

  // Merge consecutive sup tags, preserving any space between them
  result = result.replace(/<\/sup>(\s*)<sup>/gi, "$1")

  // Merge consecutive sub tags, preserving any space between them
  result = result.replace(/<\/sub>(\s*)<sub>/gi, "$1")

  return result
}

/**
 * Simplifies Word-generated HTML and returns a complete HTML document
 */
export function simplifyWordHtmlToDocument(
  html: string,
  options: SimplifyHtmlOptions = {},
): string {
  const simplifiedContent = simplifyWordHtml(html, options)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Document simplifié</title>
</head>
<body>
${simplifiedContent}
</body>
</html>`
}
