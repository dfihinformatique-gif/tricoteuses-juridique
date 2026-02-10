import { describe, expect, test } from "vitest"

import { simplifyWordHtml } from "./html_simplifier.js"

describe("simplifyWordHtml", () => {
  describe("alinea numbering", () => {
    // Create a minimal HTML structure with alinea markers using known image hashes
    // The simplifier expects images with width="45" and height="31" or height="30"
    const createAlineaMarkerHtml = (
      zIndex: number,
      imageHash: string,
    ): string => {
      // Simulate the Word-generated HTML with absolutely positioned image markers
      // Use the exact dimensions the simplifier expects (width=45, height=31)
      return `<span style="position:absolute;z-index:${zIndex}"><img width="45" height="31" src="data:image/png;base64,${imageHash}"/></span>`
    }

    // Known hash for alinéa 5
    const HASH_ALINEA_5 = "3897ae4eea49099dacd75569920c84b7"
    // Known hash for alinéa 10
    const HASH_ALINEA_10 = "9ab410689bdbec299cc78b83b78c7044"
    // Known hash for alinéa 12
    const HASH_ALINEA_12 = "fd8f5b154eeb18c6c37f9710db2c3208"

    test("absolute mode: uses image hash to determine alinea numbers", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(5, HASH_ALINEA_5)}
          <p class="assnatFPFprojetloiartexte">First paragraph text.</p>
          ${createAlineaMarkerHtml(10, HASH_ALINEA_10)}
          <p class="assnatFPFprojetloiartexte">Second paragraph text.</p>
          ${createAlineaMarkerHtml(12, HASH_ALINEA_12)}
          <p class="assnatFPFprojetloiartexte">Third paragraph text.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input, { relativeAlineaNumbers: false })

      // In absolute mode, alinea numbers come from the image hash mapping
      expect(output).toContain('data-alinea="5"')
      expect(output).toContain('data-alinea="10"')
      expect(output).toContain('data-alinea="12"')
      // The visible text should show the absolute numbers
      expect(output).toContain(">5</span>")
      expect(output).toContain(">10</span>")
      expect(output).toContain(">12</span>")
    })

    test("relative mode: numbers alineas sequentially from 1", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(5, HASH_ALINEA_5)}
          <p class="assnatFPFprojetloiartexte">First paragraph text.</p>
          ${createAlineaMarkerHtml(10, HASH_ALINEA_10)}
          <p class="assnatFPFprojetloiartexte">Second paragraph text.</p>
          ${createAlineaMarkerHtml(12, HASH_ALINEA_12)}
          <p class="assnatFPFprojetloiartexte">Third paragraph text.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input, { relativeAlineaNumbers: true })

      // In relative mode, alineas are numbered 1, 2, 3 regardless of the image hash
      expect(output).toContain('data-alinea="1"')
      expect(output).toContain('data-alinea="2"')
      expect(output).toContain('data-alinea="3"')
      // The visible text should show the relative numbers
      expect(output).toContain(">1</span>")
      expect(output).toContain(">2</span>")
      expect(output).toContain(">3</span>")
      // Should NOT contain the absolute numbers
      expect(output).not.toContain('data-alinea="5"')
      expect(output).not.toContain('data-alinea="10"')
      expect(output).not.toContain('data-alinea="12"')
    })

    test("relative mode: resets counter at each article", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(5, HASH_ALINEA_5)}
          <p class="assnatFPFprojetloiartexte">Article 1 - first paragraph.</p>
          ${createAlineaMarkerHtml(10, HASH_ALINEA_10)}
          <p class="assnatFPFprojetloiartexte">Article 1 - second paragraph.</p>

          <p class="assnat9ArticleNum">Article 2</p>
          ${createAlineaMarkerHtml(12, HASH_ALINEA_12)}
          <p class="assnatFPFprojetloiartexte">Article 2 - first paragraph.</p>
          ${createAlineaMarkerHtml(5, HASH_ALINEA_5)}
          <p class="assnatFPFprojetloiartexte">Article 2 - second paragraph.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input, { relativeAlineaNumbers: true })

      // Both articles should have alineas numbered 1, 2
      // Count occurrences of data-alinea="1" - should be 2 (one per article)
      const alinea1Matches = output.match(/data-alinea="1"/g)
      expect(alinea1Matches).toHaveLength(2)

      // Count occurrences of data-alinea="2" - should be 2 (one per article)
      const alinea2Matches = output.match(/data-alinea="2"/g)
      expect(alinea2Matches).toHaveLength(2)

      // Should not have alinea 3 or higher
      expect(output).not.toContain('data-alinea="3"')
    })

    test("default mode is absolute (relativeAlineaNumbers defaults to false)", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(5, HASH_ALINEA_5)}
          <p class="assnatFPFprojetloiartexte">First paragraph text.</p>
        </body>
        </html>
      `

      // Call without specifying relativeAlineaNumbers
      const output = simplifyWordHtml(input, {})

      // Should use absolute mode by default
      expect(output).toContain('data-alinea="5"')
      expect(output).toContain(">5</span>")
    })
  })
})
