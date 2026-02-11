import { describe, expect, test } from "vitest"

import { simplifyWordHtml } from "./html_simplifier.js"

describe("simplifyWordHtml", () => {
  /**
   * Tests for documents with pastille-style alinea markers (small images)
   * Example source: PRJLANR5L15BTC0639
   */
  describe("alinea numbering (pastille format)", () => {
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

    test("absolute mode: handles negative z-indices (-65537 starting pattern)", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          <span style="position:absolute;z-index:-65537"><img width="45" height="31" src="data:image/png;base64,UNKNOWN_HASH_1"/></span>
          <p class="assnatFPFprojetloiartexte">First paragraph.</p>
          <span style="position:absolute;z-index:-65536"><img width="45" height="31" src="data:image/png;base64,UNKNOWN_HASH_2"/></span>
          <p class="assnatFPFprojetloiartexte">Second paragraph.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input, { relativeAlineaNumbers: false })

      // -65537 should map to 1
      expect(output).toContain('data-alinea="1"')
      expect(output).toContain(">1</span>")
      // -65536 should map to 2
      expect(output).toContain('data-alinea="2"')
      expect(output).toContain(">2</span>")
    })
  })

  /**
   * Tests for PLF (Projet de Loi de Finances) document format
   * Example source: PRJLANR5L17B1906
   * This format uses ordered lists (<ol>/<li>) instead of pastille images
   */
  describe("PLF format (PRJLANR5L17B1906)", () => {
    test("removes page header tables with assnatFARTT08Bleu class", () => {
      const input = `
        <html>
        <body>
          <table style="width:500.1pt">
            <tr>
              <td style="border-bottom:0.75pt solid #0070b9">
                <p class="assnatFARTT08Bleu">
                  <span style="font-weight:normal">Projet de loi de finances</span>
                </p>
              </td>
              <td style="border-bottom:0.75pt solid #0070b9">
                <p class="assnatFAR09Noir" style="text-align:right">
                  <span style="font-weight:bold">42</span>
                </p>
              </td>
            </tr>
          </table>
          <p class="assnatFPFexpogentitre1">Actual content here</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Page header table should be removed
      expect(output).not.toContain("Projet de loi de finances")
      expect(output).not.toContain("42")
      // Actual content should remain
      expect(output).toContain("Actual content here")
    })

    test("removes header and footer elements", () => {
      const input = `
        <html>
        <body>
          <p class="assnatHeader">Header content</p>
          <p class="assnatFooter">Footer content</p>
          <p class="assnatFARSautApres">Page break after</p>
          <p class="assnatFARSautAvant">Page break before</p>
          <p>Actual content</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).not.toContain("Header content")
      expect(output).not.toContain("Footer content")
      expect(output).not.toContain("Page break")
      expect(output).toContain("Actual content")
    })

    test("removes br elements with page-break styles", () => {
      const input = `
        <html>
        <body>
          <p>Before</p>
          <br style="page-break-before:always; clear:both" />
          <p>After</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).not.toContain("page-break")
      expect(output).toContain("Before")
      expect(output).toContain("After")
    })

    test("cleans ordered lists and removes Word styling", () => {
      const input = `
        <html>
        <body>
          <ol class="assnatawlist1" style="margin:0pt; padding-left:0pt">
            <li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
              First item content
            </li>
          </ol>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Style and class attributes should be removed
      expect(output).not.toContain("font-size:7pt")
      expect(output).not.toContain("color:#0070b9")
      expect(output).not.toContain("assnatawlist")
      expect(output).not.toContain("assnatFPFprojetloiartexte")
      // Content should remain
      expect(output).toContain("First item content")
      // Should have list CSS styles
      expect(output).toContain("ol > li::before")
    })

    test("preserves start attribute on ordered lists", () => {
      const input = `
        <html>
        <body>
          <ol start="5" class="assnatawlist3" style="margin:0pt">
            <li class="assnatFPFprojetloiartexte" style="font-size:7pt">Item 5</li>
            <li class="assnatFPFprojetloiartexte" style="font-size:7pt">Item 6</li>
          </ol>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Start attribute should be preserved
      expect(output).toContain('start="5"')
      // Counter-reset should be set for CSS counters
      expect(output).toContain("counter-reset: list-counter 4")
    })

    test("removes leading nbsp from list items", () => {
      const input = `
        <html>
        <body>
          <ol>
            <li>&#xa0;&#xa0;&#xa0;&#xa0;Actual content here</li>
          </ol>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Leading nbsp should be removed
      expect(output).toContain("<li>Actual content here")
      expect(output).not.toMatch(/<li>\s*&#xa0;/)
    })

    test("preserves large illustration images", () => {
      const input = `
        <html>
        <body>
          <p>Some text</p>
          <img width="666" height="556" src="data:image/png;base64,LARGE_IMAGE_DATA" style="some-style" class="some-class"/>
          <img width="15" height="15" src="data:image/png;base64,SMALL_ICON_DATA"/>
          <p>More text</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Large image should be preserved (but without style/class)
      expect(output).toContain('width="666"')
      expect(output).toContain('height="556"')
      expect(output).not.toContain("some-style")
      expect(output).not.toContain("some-class")
      // Small image should be removed
      expect(output).not.toContain('width="15"')
    })
  })

  /**
   * Tests for space preservation between formatting tags
   * Example source: PRJLANR5L17B1906 (ARTICLE 1, ARTICLE 2, etc.)
   */
  describe("space preservation", () => {
    test("preserves spaces between consecutive strong tags", () => {
      const input = `
        <html>
        <body>
          <p>
            <span style="font-weight:bold">ARTICLE</span>
            <span> </span>
            <span style="font-weight:bold">3</span>
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Space between ARTICLE and 3 should be preserved
      expect(output).toContain("ARTICLE 3")
      expect(output).not.toContain("ARTICLE3")
    })

    test("preserves spaces in merged em tags", () => {
      const input = `
        <html>
        <body>
          <p>
            <span style="font-style:italic">Hello</span>
            <span> </span>
            <span style="font-style:italic">World</span>
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("Hello World")
      expect(output).not.toContain("HelloWorld")
    })

    test("preserves spaces when unwrapping spans with only whitespace", () => {
      const input = `
        <html>
        <body>
          <p>Word1<span class="assnatSomeClass"> </span>Word2</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("Word1 Word2")
      expect(output).not.toContain("Word1Word2")
    })
  })
})
