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
    const createAlineaMarkerHtml = (imageHash: string): string => {
      // Simulate the Word-generated HTML with absolutely positioned image markers
      // Use the exact dimensions the simplifier expects (width=45, height=31)
      return `<span style="position:absolute"><img width="45" height="31" src="data:image/png;base64,${imageHash}"/></span>`
    }

    // Base64 content that will be hashed by the code
    const DATA_ALINEA_565 =
      "iVBORw0KGgoAAAANSUhEUgAAAC0AAAAeCAYAAAC49JeZAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBD6fLggAAAplJREFUWIXt1k2IlVUYB/BfVrq4k1BxnZQWpjAKTWM6CzftrFm0uEVLJ1duZjOtjFatFBSizczKTaBiEILUpqimzUCQoZJQoDDSwIhOicjo2KIWt8XzvNx3Poo51+4iuH94Oec85+t/nvf5oo8+eoadOIyLaP/DN4tjaOX6x8YTXe5r4AN8WJNdxw94WJO9iAG8UZON49Mu7+0aB3FZaPF9G9feMKZy35mCfWvwZOH6ptDSKCbwHTZjW87/kW0DQxjE70m4jSu4h/fwHL7FX6WkS81jCpN4V2i8nfJbuI3z4vcTZrGcsrb1MYHThRyKSB/CTF70E17F9xgRD/hR2PMzSfgOHuEmfl111nS2k3gJ86XEN4rjOhobF9FgvDbfzHE1V6EyjdXa3pmycYXYVLD2gI6GFnU02hI2PIYd+UkyDezK8RUR+po5rrS7t1ekG3gTC7UHEDa7Xdj4n3iAq+JBO/B29gnn/Qhf1YhPY3+vSFd4kO0FzNWIL+flLbxQWzuAb/CK8AWC/Du1M4tzxUZJP8KXeDnH87iEz4Xz7cUW4XTXhIMSjxnEzyJKnEt5dc5k7ukJaXn4ZPYbNfl2kQ3vYwn7dMLdgJUZ8vlsF3SSy6UyyjxVsHZGkG7hdXwhyG9NgvM5nhPaXRSmclwkEsIvCLs+mv1rpaRLMuIN7MZJoZ0lobl5oblZvIank/CzIt1/IrLjUJ7zlnDasziBz0pJl6KKrZdFSBvWiQQVhkUiquSNlB1MWVW7XLXSzHqKQ3lhW5SlG724IeJ0O/d3XTB1W5o28TGO5HhWFEJfW1uajojoMpqyEzglIlJX6JZ0hRb2CMcc+5d10/hF1CzF0WI1Hpd0haaIGOvhN9z9j+7po48++ujjf4C/AW7GjiT2VNxYAAAAAElFTkSuQmCC"
    const DATA_ALINEA_65 =
      "iVBORw0KGgoAAAANSUhEUgAAAC0AAAAfCAYAAABzqEQ8AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAfhJREFUWIXt1r9rFGEQxvGPPwrhRAsJRm2OIBjIWahFCjsjikFS2AimtDibdGqvaa20UMso/geiCBaKVcBEBcsEAtrZSEgKq7OYOW49T81lz1yzX3h535uZd+/Z2XdnloqKP7Kn5P46pnEH93AM+/AD30tee+DUcBetwljt+n1taOp6MIn3Qtgtke0iDdxP/0IP/44zIgQvC/GEqHO5bmAiR/tJLIgnMzTaGWwIsbNopp1fj0dxNAcpYm8fsVOYww1s4GLaN/BF72PwIOdHeIW17Ygsw7zIGpHh9hhJW0Mns0XqaZsdlJDdfcSeFpmrYz+OYhwX0jaWcUu4qXMzazmPl1JaYNcW42riGNwWL+EoVrCJq/ia13pY2LOES/gmzvwYLg9CdD+ZhnVxA+M4jrN4gwPpPynOPJzBlcLerSbon2xV9CZeiFK2iYNpfyyyvo4P+Jy2p+mfyHlONJ+B0E+mV/PPa1gU2a6nbwWnCrGHci5WlcXtiuymH9Gvcz6S8zoOC8Gj4hvkeY7pjHmJ67n+VEppCZ7olK+Zwmj6vaHMiK7ZEuVyaNR1WvOUENVIXy3Xk6Lctb9Rlg25jRNil3W+5LoF1USdbmVcfSfF/Y0RnaPSwlvxon0s2Ob9pwyXrZ0zOIHzojM+wzshfmDVoqKioqKioqIXPwGGHnBAFFvvyQAAAABJRU5ErkJggg=="

    test("use image hash to determine alinea numbers", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(DATA_ALINEA_565)}
          <p class="assnatFPFprojetloiartexte">First paragraph text.</p>
          ${createAlineaMarkerHtml(DATA_ALINEA_65)}
          <p class="assnatFPFprojetloiartexte">Second paragraph text.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // In absolute mode, alinea numbers come from the image hash mapping
      expect(output).toContain('data-alinea="565"')
      expect(output).toContain('data-alinea="65"')
      // The visible text should show the absolute numbers
      expect(output).toContain(">565</span>")
      expect(output).toContain(">65</span>")
    })

    test("default mode is absolute (relativeAlineaNumbers defaults to false)", () => {
      const input = `
        <html>
        <body>
          <p class="assnat9ArticleNum">Article 1er</p>
          ${createAlineaMarkerHtml(DATA_ALINEA_565)}
          <p class="assnatFPFprojetloiartexte">First paragraph text.</p>
        </body>
        </html>
      `

      // Call without specifying relativeAlineaNumbers
      const output = simplifyWordHtml(input, {})

      // Should use absolute mode by default
      expect(output).toContain('data-alinea="565"')
      expect(output).toContain(">565</span>")
    })
  })

  /**
   * Tests for cover page (first page) styling
   * Example source: PRJLANR5L17B1906
   */
  describe("cover page styling", () => {
    test("styles cover page title (assnatFARCouvTitre)", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFARCouvTitre">
            Projet de loi de finances pour 2026
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('class="cover-title"')
      expect(output).toContain("Projet de loi de finances pour 2026")
      expect(output).toContain(".cover-title {")
    })

    test("styles cover page subtitle (assnatFARCouvTitreD)", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFARCouvTitreD">
            Projet de loi de finances pour 2026
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('class="cover-subtitle"')
      expect(output).toContain("Projet de loi de finances pour 2026")
      expect(output).toContain(".cover-subtitle {")
    })

    test("styles cover page info (assnatFPFprem)", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFPFprem">
            Constitution du 4 octobre 1958
          </p>
          <p class="assnatFPFprem">
            Dix-septième législature
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('class="cover-info"')
      expect(output).toContain("Constitution du 4 octobre 1958")
      expect(output).toContain("Dix-septième législature")
      expect(output).toContain(".cover-info {")
    })

    test("styles cover page year (assnatFARCouvAnnee)", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFARCouvAnnee">
            2026
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('class="cover-year"')
      expect(output).toContain("2026")
      expect(output).toContain(".cover-year {")
    })

    test("full cover page with multiple elements", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFARCouvTitre">
            Projet de loi de finances pour 2026
          </p>
          <p class="assnatFPFprem">
            Assemblée nationale
          </p>
          <p class="assnatFPFprem">
            Constitution du 4 octobre 1958
          </p>
          <p class="assnatFARCouvAnnee">
            2026
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('class="cover-title"')
      expect(output).toContain('class="cover-info"')
      expect(output).toContain('class="cover-year"')
      // All cover page styles should be included
      expect(output).toContain(".cover-title {")
      expect(output).toContain(".cover-info {")
      expect(output).toContain(".cover-year {")
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

    test("preserves center alignment on list items", () => {
      const input = `
        <html>
        <body>
          <ol>
            <li style="text-align: center; font-family:Arial; font-size:7pt">Centered title</li>
            <li style="font-family:Arial; font-size:7pt">Normal item</li>
          </ol>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Center alignment should be preserved
      expect(output).toContain(
        '<li style="text-align: center">Centered title</li>',
      )
      // Non-centered li should not have style
      expect(output).toMatch(/<li>Normal item<\/li>/)
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

    test("converts assnatEmphasis class to italic (for bis, ter, quater, etc.)", () => {
      const input = `
        <html>
        <body>
          <p>
            <span style="font-family:Marianne">article 792-0</span>
            <span class="assnatEmphasis" style="font-family:Marianne">bis</span>
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // assnatEmphasis should be converted to <em>
      expect(output).toContain("<em>bis</em>")
    })

    test("converts assnatStrongEmphasis class to bold (for emphasized text)", () => {
      const input = `
        <html>
        <body>
          <p>
            <span class="assnatStrongEmphasis">Assemblée nationale</span>
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // assnatStrongEmphasis should be converted to <strong>
      expect(output).toContain("<strong>Assemblée nationale</strong>")
      // Should NOT be converted to <em>
      expect(output).not.toContain("<em>Assemblée nationale</em>")
    })

    test("always converts &nbsp; to non-breaking space character (\u00a0)", () => {
      const input = `
        <html>
        <body>
          <p>Text with&nbsp;nbsp.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // &nbsp; should be converted to \u00a0
      expect(output).toContain("Text with\u00a0nbsp.")
      expect(output).not.toContain("&nbsp;")
    })
  })

  /**
   * Tests for exposé des motifs styling
   * Example source: PRJLANR5L17B1906
   */
  describe("exposé des motifs", () => {
    test("styles expose des motifs title", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFPFexpogentitre1">
            Exposé des motifs
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Title should have the expose-motifs-titre class
      expect(output).toContain('class="expose-motifs-titre"')
      expect(output).toContain("Exposé des motifs")
    })

    test("wraps expose des motifs text in styled container", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFPFexpogentitre1">
            Exposé des motifs
          </p>
          <p class="assnatFPFexpogentexte">
            Premier paragraphe de l'exposé.
          </p>
          <p class="assnatFPFexpogentexte">
            Deuxième paragraphe de l'exposé.
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should have expose-motifs container
      expect(output).toContain('class="expose-motifs"')
      // Content should be inside
      expect(output).toContain("Premier paragraphe")
      expect(output).toContain("Deuxième paragraphe")
      // Should have CSS styles for expose-motifs
      expect(output).toContain(".expose-motifs {")
      expect(output).toContain("border-left:")
    })

    test("handles expose des motifs text inside tables", () => {
      const input = `
        <html>
        <body>
          <p class="assnatFPFexpogentitre1">
            Exposé des motifs
          </p>
          <table>
            <tr>
              <td>
                <p class="assnatFPFexpogentexte">
                  Texte dans une table.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should extract text from table and wrap in container
      expect(output).toContain('class="expose-motifs"')
      expect(output).toContain("Texte dans une table")
    })
  })

  /**
   * Tests for table styling preservation
   * Example source: PRJLANR5L17B1906
   */
  describe("table styling", () => {
    test("preserves border styles on tables and cells", () => {
      const input = `
        <html>
        <body>
          <table style="width:100%; padding:0pt; border-collapse:collapse; font-size:12pt">
            <tr>
              <td style="width:494.9pt; border-left:1.5pt solid #0070b9; padding:0pt 0pt 0pt 3.25pt; vertical-align:middle; color:blue">
                <p>Cell content</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Table styles should be preserved
      expect(output).toContain("border-collapse:collapse")
      expect(output).toContain("width:100%")
      // Cell border and padding should be preserved
      expect(output).toContain("border-left:1.5pt solid #0070b9")
      expect(output).toContain("padding:0pt 0pt 0pt 3.25pt")
      expect(output).toContain("vertical-align:middle")
      // Font-size and color should be removed (not table-relevant)
      expect(output).not.toContain("font-size:12pt")
      expect(output).not.toContain("color:blue")
    })

    test("preserves multiple border properties", () => {
      const input = `
        <html>
        <body>
          <table style="border:0.75pt solid #0070b9; padding:0pt">
            <tr>
              <td style="border-right:0.75pt solid #0070b9; border-bottom:0.75pt solid #0070b9; padding:1.4pt">
                <p>Content</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("border:0.75pt solid #0070b9")
      expect(output).toContain("border-right:0.75pt solid #0070b9")
      expect(output).toContain("border-bottom:0.75pt solid #0070b9")
    })

    test("removes class attributes from tables", () => {
      const input = `
        <html>
        <body>
          <table class="someWordClass" style="width:100%">
            <tr class="rowClass">
              <td class="cellClass" style="padding:5pt">Content</td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Classes should be removed
      expect(output).not.toContain("someWordClass")
      expect(output).not.toContain("rowClass")
      expect(output).not.toContain("cellClass")
      // But styles should be kept
      expect(output).toContain("width:100%")
      expect(output).toContain("padding:5pt")
    })

    test("unwraps styling tables that contain article titles", () => {
      const input = `
        <html>
        <body>
          <table style="width:100%; padding:0pt; border-collapse:collapse">
            <tbody><tr>
              <td style="width:497.5pt; border-left:0.75pt solid #0070b9; border-bottom:0.75pt solid #0070b9; padding:0pt 0pt 1.4pt 1.02pt; vertical-align:middle">
                <h6>
                  <span id="_Toc211281758"><strong>ARTICLE 4</strong> : <br>Prorogation en 2026 avec division par deux des taux</span>
                </h6>
              </td>
            </tr>
          </tbody></table>
          <p>Content after table</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Table should be removed (unwrapped)
      expect(output).not.toContain("<table")
      expect(output).not.toContain("</table>")
      expect(output).not.toContain("<tbody")
      expect(output).not.toContain("<tr")
      expect(output).not.toContain("<td")
      // Content should be preserved
      expect(output).toContain("ARTICLE 4")
      expect(output).toContain("Prorogation en 2026")
      expect(output).toContain("Content after table")
      // Heading should be preserved (may have id attribute hoisted from inner span)
      expect(output).toMatch(/<h6(\s|>)/)
      // The id from the inner span should be hoisted to the heading
      expect(output).toContain('id="_Toc211281758"')
    })

    test("keeps regular tables with multiple rows", () => {
      const input = `
        <html>
        <body>
          <table style="width:100%">
            <tr>
              <td style="border-left:0.75pt solid #0070b9">
                <h6>Row 1</h6>
              </td>
            </tr>
            <tr>
              <td>
                <p>Row 2</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Table with multiple rows should be kept
      expect(output).toContain("<table")
      expect(output).toContain("</table>")
    })

    test("keeps tables with multiple cells per row", () => {
      const input = `
        <html>
        <body>
          <table style="width:100%">
            <tr>
              <td style="border-left:0.75pt solid #0070b9">
                <h6>Cell 1</h6>
              </td>
              <td>
                <p>Cell 2</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Table with multiple cells should be kept
      expect(output).toContain("<table")
      expect(output).toContain("</table>")
    })

    test("keeps tables without border styling even with single cell heading", () => {
      const input = `
        <html>
        <body>
          <table style="width:100%">
            <tr>
              <td style="padding:5pt">
                <h6>Title without border styling</h6>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Table without border styling should be kept
      expect(output).toContain("<table")
      expect(output).toContain("</table>")
    })
  })

  /**
   * Tests for table of contents link preservation
   * Example source: PRJLANR5L17B1906
   */
  describe("table of contents links", () => {
    test("preserves _Toc anchor targets for TOC links", () => {
      const input = `
        <html>
        <body>
          <p class="assnatTOC1">
            <a href="#_Toc211281745"><span class="assnatHyperlink">Exposé général des motifs</span></a>
          </p>
          <h1>
            <a id="_Toc211281745"><span>Exposé général des motifs</span></a>
          </h1>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // TOC link should be preserved
      expect(output).toContain('href="#_Toc211281745"')
      // Target anchor should be preserved (converted to span with id)
      expect(output).toContain('id="_Toc211281745"')
    })

    test("preserves multiple TOC links and their targets", () => {
      const input = `
        <html>
        <body>
          <p class="assnatTOC6">
            <a href="#_Toc211281754"><span>ARTICLE 1</span></a>
          </p>
          <p class="assnatTOC6">
            <a href="#_Toc211281755"><span>ARTICLE 2</span></a>
          </p>
          <h6><a id="_Toc211281754"><span>ARTICLE 1</span></a></h6>
          <h6><a id="_Toc211281755"><span>ARTICLE 2</span></a></h6>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // All TOC links should be preserved
      expect(output).toContain('href="#_Toc211281754"')
      expect(output).toContain('href="#_Toc211281755"')
      // All target anchors should be preserved
      expect(output).toContain('id="_Toc211281754"')
      expect(output).toContain('id="_Toc211281755"')
    })
  })

  /**
   * Tests for hoisting span ids to parent elements
   */
  describe("span id hoisting", () => {
    test("hoists id from span to parent when span is only child", () => {
      const input = `
        <html>
        <body>
          <p><span id="anchor123">Some text content</span></p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The id should be hoisted to the p element
      expect(output).toContain('<p id="anchor123">Some text content</p>')
      // Should not have a span with id inside p
      expect(output).not.toContain('<span id="anchor123">')
    })

    test("hoists id from span to heading when span is only child", () => {
      const input = `
        <html>
        <body>
          <h1><span id="_Toc123456">Chapter Title</span></h1>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The id should be hoisted to the h1 element
      expect(output).toContain('<h1 id="_Toc123456">Chapter Title</h1>')
      expect(output).not.toContain('<span id="_Toc123456">')
    })

    test("does not hoist id when span has other attributes", () => {
      const input = `
        <html>
        <body>
          <p><span id="anchor123" class="highlight">Some text</span></p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The span should remain because it has a class attribute
      expect(output).toContain('id="anchor123"')
      // The p should not have the id
      expect(output).not.toContain('<p id="anchor123">')
    })

    test("does not hoist id when parent already has an id", () => {
      const input = `
        <html>
        <body>
          <p id="existing"><span id="anchor123">Some text</span></p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Parent should keep its original id
      expect(output).toContain('id="existing"')
      // The span id should still be present somewhere
      expect(output).toContain('id="anchor123"')
    })

    test("does not hoist id when span is not the only child", () => {
      const input = `
        <html>
        <body>
          <p>Prefix text <span id="anchor123">Some text</span> suffix text</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The span should remain because there's other content in the parent
      expect(output).toContain('id="anchor123"')
      expect(output).not.toContain('<p id="anchor123">')
    })

    test("hoists id in table cells", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><span id="cell_anchor">Cell content</span></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The id should be hoisted to the td element
      expect(output).toContain('<td id="cell_anchor">Cell content</td>')
      expect(output).not.toContain('<span id="cell_anchor">')
    })

    test("hoists id in list items", () => {
      const input = `
        <html>
        <body>
          <ol>
            <li><span id="item_anchor">List item text</span></li>
          </ol>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The id should be hoisted to the li element
      expect(output).toContain('<li id="item_anchor">List item text</li>')
      expect(output).not.toContain('<span id="item_anchor">')
    })
  })

  /**
   * Tests for bold formatting implied by CSS classes
   */
  describe("bold class handling", () => {
    test("wraps content in strong when paragraph has assnatetatagr class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagr">A. Recettes fiscales</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Content should be wrapped in <strong>
      expect(output).toContain("<strong>A. Recettes fiscales</strong>")
    })

    test("wraps content in strong when paragraph has assnatetatagrM class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagrM">493 186</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("<strong>493 186</strong>")
    })

    test("wraps content in strong when paragraph has assnatetatagrgr class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagrgr">Recettes totales nettes</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("<strong>Recettes totales nettes</strong>")
    })

    test("wraps content in strong when paragraph has assnatTableHeading class", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p class="assnatTableHeading">Column Header</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("<strong>Column Header</strong>")
    })

    test("does not double-wrap content already in strong", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagr"><strong>Already bold</strong></p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should not have nested strong tags
      expect(output).toContain("<strong>Already bold</strong>")
      expect(output).not.toContain("<strong><strong>")
    })

    test("preserves bold in table cells with bold classes", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p class="assnatetatagr">Category A</p></td>
              <td><p class="assnatetatagrM">1 000</p></td>
            </tr>
            <tr>
              <td><p class="assnatetatalr">Regular row</p></td>
              <td><p class="assnatetatalrM">500</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Bold classes should result in strong tags
      expect(output).toContain("<strong>Category A</strong>")
      expect(output).toContain("<strong>1 000</strong>")
      // Non-bold classes should not have strong
      expect(output).toContain("Regular row")
      expect(output).not.toContain("<strong>Regular row</strong>")
      expect(output).toContain("500")
    })

    test("applies right alignment from assnatetatagrM class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagrM">493 186</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should have both bold and right alignment
      expect(output).toContain("<strong>493 186</strong>")
      expect(output).toContain('align="right"')
    })

    test("applies center alignment from assnatTableHeading class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatTableHeading">Column Header</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should have both bold and center alignment
      expect(output).toContain("<strong>Column Header</strong>")
      expect(output).toContain('align="center"')
    })

    test("applies right alignment from assnatligneTequilibre class", () => {
      const input = `
        <html>
        <body>
          <p class="assnatligneTequilibre">1 234 567</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain("<strong>1 234 567</strong>")
      expect(output).toContain('align="right"')
    })

    test("explicit style alignment takes priority over class alignment", () => {
      const input = `
        <html>
        <body>
          <p class="assnatetatagrM" style="text-align: center">Override</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Style alignment should override class alignment
      expect(output).toContain('align="center"')
      expect(output).not.toContain('align="right"')
    })

    test("preserves alignment in table cells with different classes", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p class="assnatetatagr">Left aligned bold</p></td>
              <td><p class="assnatetatagrM">Right aligned bold</p></td>
              <td><p class="assnatligneequilibrec7">Center bold</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // All should be bold
      expect(output).toContain("<strong>Left aligned bold</strong>")
      expect(output).toContain("<strong>Right aligned bold</strong>")
      expect(output).toContain("<strong>Center bold</strong>")
      // Check alignments (now on td since td/p are merged)
      expect(output).toMatch(/<td[^>]*align="right"[^>]*>.*Right aligned bold/)
      expect(output).toMatch(/<td[^>]*align="center"[^>]*>.*Center bold/)
    })
  })

  /**
   * Tests for merging td cells with their single p child
   */
  describe("td/p merging", () => {
    test("merges td containing only a p element", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p>Simple text</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The p should be removed, content directly in td
      expect(output).toContain("<td>Simple text</td>")
      expect(output).not.toContain("<td><p>")
    })

    test("transfers align attribute from p to td when merging", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p class="assnatetatagrM">493 186</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The td should have the align attribute and the strong content
      expect(output).toContain(
        '<td align="right"><strong>493 186</strong></td>',
      )
      expect(output).not.toContain("<p")
    })

    test("transfers id attribute from p to td when merging", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p id="cell_id">Content</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      expect(output).toContain('<td id="cell_id">Content</td>')
      expect(output).not.toContain("<p")
    })

    test("does not merge when td has multiple children", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><p>First</p><p>Second</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Should keep the p elements
      expect(output).toContain("<p>First</p>")
      expect(output).toContain("<p>Second</p>")
    })

    test("does not merge when td contains non-p content", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td><strong>Bold text</strong></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Strong should remain directly in td
      expect(output).toContain("<td><strong>Bold text</strong></td>")
    })

    test("merges th containing only a p element", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <th><p class="assnatTableHeading">Header</p></th>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The th should have the align and content without p
      expect(output).toContain(
        '<th align="center"><strong>Header</strong></th>',
      )
      expect(output).not.toContain("<p")
    })

    test("preserves cell align if already set when merging", () => {
      const input = `
        <html>
        <body>
          <table>
            <tr>
              <td style="text-align: left"><p class="assnatetatagrM">Value</p></td>
            </tr>
          </table>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The p's align should be used since td style is cleaned
      expect(output).toContain('align="right"')
      expect(output).toContain("<strong>Value</strong>")
    })
  })

  /**
   * Tests for large image preservation in position:absolute spans
   * Example: cover page illustrations in PLF documents
   */
  describe("large image preservation", () => {
    test("removes large background images with z-index:-65537", () => {
      // Large images with z-index:-65537 are background/watermark images
      // that cause layout issues and should be removed
      const input = `
        <html>
        <body>
          <p class="assnatFAR09Noir">
            <span style="height:0pt; text-align:left; display:block; position:absolute; z-index:-65537">
              <img src="data:image/png;base64,iVBORw0KGgo..." width="732" height="937" alt="" />
            </span>
            Texte après l'image
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Large background image with z-index:-65537 should be removed
      expect(output).not.toContain('width="732"')
      expect(output).not.toContain('height="937"')
      // Text content should still be preserved
      expect(output).toContain("Texte après l'image")
    })

    test("removes small images in position:absolute spans", () => {
      const input = `
        <html>
        <body>
          <p>
            <span style="height:0pt; position:absolute; z-index:5">
              <img src="data:image/png;base64,small..." width="45" height="31" alt="" />
            </span>
            Some text
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Small image (pastille) should be removed
      expect(output).not.toContain('width="45"')
      expect(output).not.toContain('height="31"')
    })

    test("unwraps large images from their span container", () => {
      const input = `
        <html>
        <body>
          <p>
            <span style="height:0pt; position:absolute; z-index:-1">
              <img src="data:image/png;base64,large..." width="500" height="400" alt="Cover" />
            </span>
          </p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Image should be present but not wrapped in span with position:absolute
      expect(output).toContain('width="500"')
      expect(output).toContain('alt="Cover"')
      expect(output).not.toContain("position:absolute")
    })

    /**
     * Tests for alignment-only classes (no bold)
     */
    describe("alignment-only class handling", () => {
      test("applies right alignment from assnatetatalrM class (no bold)", () => {
        const input = `
          <html>
          <body>
            <p class="assnatetatalrM">500</p>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        // Should have right alignment but no bold
        expect(output).toContain('align="right"')
        expect(output).toContain(">500<")
        expect(output).not.toContain("<strong>500</strong>")
      })

      test("applies center alignment from assnatetatalrC class (no bold)", () => {
        const input = `
          <html>
          <body>
            <p class="assnatetatalrC">Centered text</p>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        expect(output).toContain('align="center"')
        expect(output).not.toContain("<strong>")
      })

      test("applies right alignment from assnattable-ligneD class", () => {
        const input = `
          <html>
          <body>
            <table>
              <tr>
                <td><p class="assnattable-ligneD">1 234</p></td>
              </tr>
            </table>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        // After td/p merge, alignment should be on td
        expect(output).toContain('<td align="right">1 234</td>')
        expect(output).not.toContain("<strong>")
      })

      test("applies center alignment from assnattable-entete class", () => {
        const input = `
          <html>
          <body>
            <table>
              <tr>
                <td><p class="assnattable-entete">Header</p></td>
              </tr>
            </table>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        expect(output).toContain('<td align="center">Header</td>')
        expect(output).not.toContain("<strong>")
      })

      test("applies right alignment from assnatligneequilibre class", () => {
        const input = `
          <html>
          <body>
            <p class="assnatligneequilibre">12 345</p>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        expect(output).toContain('align="right"')
        expect(output).not.toContain("<strong>")
      })

      test("differentiates bold vs non-bold classes in same table", () => {
        const input = `
          <html>
          <body>
            <table>
              <tr>
                <td><p class="assnatetatagr">Bold label</p></td>
                <td><p class="assnatetatagrM">Bold right</p></td>
                <td><p class="assnatetatalrM">Normal right</p></td>
              </tr>
            </table>
          </body>
          </html>
        `

        const output = simplifyWordHtml(input)

        // Bold classes should have strong
        expect(output).toContain("<strong>Bold label</strong>")
        expect(output).toContain("<strong>Bold right</strong>")
        // Non-bold class should not have strong
        expect(output).not.toContain("<strong>Normal right</strong>")
        expect(output).toContain(">Normal right<")
        // Alignments
        expect(output).toMatch(
          /<td[^>]*align="right"[^>]*>.*<strong>Bold right<\/strong>/,
        )
        expect(output).toMatch(/<td[^>]*align="right"[^>]*>Normal right/)
      })
    })
  })

  describe("background/watermark image removal", () => {
    test("removes images with z-index:-65537", () => {
      const input = `
        <html>
        <body>
          <span style="position:absolute;z-index:-65537">
            <img width="200" height="150" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="/>
          </span>
          <p>Normal content that should be preserved.</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // The background image span should be completely removed
      expect(output).not.toContain("z-index:-65537")
      expect(output).not.toContain(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
      )
      // Normal content should still be present
      expect(output).toContain("Normal content that should be preserved.")
    })

    test("preserves other absolutely positioned elements", () => {
      const input = `
        <html>
        <body>
          <span style="position:absolute;z-index:-65537">
            <img width="200" height="150" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"/>
          </span>
          <span style="position:absolute;z-index:1">
            <img width="45" height="31" src="data:image/png;base64,alinea"/>
          </span>
          <p>Content</p>
        </body>
        </html>
      `

      const output = simplifyWordHtml(input)

      // Background image should be removed
      expect(output).not.toContain("z-index:-65537")
      expect(output).not.toContain("iVBORw0KGgoAAAANSUhEUgAAAAUA")
      // Other absolutely positioned elements may be processed differently
      // (either converted to alinea markers or removed based on size)
      expect(output).toContain("Content")
    })
  })
})
