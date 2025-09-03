import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"

import { iterTextLinks } from "./text_links.js"

describe("iterTextLinks", () => {
  test("Explicit link in text", async () => {
    const input =
      "à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151 de la loi n° 2020-1721 du 29 décembre 2020"
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links.length).toBe(5)
    const link3 = links[3]
    expect(link3).toStrictEqual({
      article: {
        num: "27",
        position: {
          start: 83,
          stop: 85,
        },
        type: "article",
      },
      articleId: "LEGIARTI000051217583",
      position: {
        start: 83,
        stop: 85,
      },
      type: "article",
    })
    expect(context.text(link3.position)).toBe("27")
  })

  test("Implicit link in HTML", async () => {
    const transformation = simplifyHtml({ removeAWithHref: true })(dedent`
      <ol class="assnatawlist4" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">I.</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">-</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">Le code général des impôts est ainsi modifié</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">:</span>
				</li>
			</ol>
			<ol start="2" class="assnatawlist3" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">A.</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">– A la première phrase du second alinéa de l’article 196 B, le montant</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">: «</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">6</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">674</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">€</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">» est remplacé par le montant</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">: «</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">6</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">807</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">€</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">»</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">;</span>
				</li>
			</ol>
    `)
    const context = new TextParserContext(transformation.output)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links.length).toBe(2)
    const link0 = links[0]
    expect(link0).toStrictEqual({
      position: {
        start: 5,
        stop: 31,
      },
      text: {
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: {
          start: 5,
          stop: 31,
        },
        title: "Code général des impôts",
        type: "texte",
      },
      type: "texte",
    })
    expect(context.text(link0.position)).toBe("Le code général des impôts")
    const link1 = links[1]
    expect(link1).toStrictEqual({
      article: {
        implicitText: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 8,
            stop: 31,
          },
          title: "Code général des impôts",
          type: "texte",
        },
        num: "196 B",
        position: {
          start: 100,
          stop: 113,
        },
        type: "article",
      },
      articleId: "LEGIARTI000051212977",
      position: {
        start: 100,
        stop: 113,
      },
      type: "article",
    })
  })

  test("Implicit link in text", async () => {
    const input = dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé par le montant : « 6 807 € » ;
    `
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links.length).toBe(2)
    const link0 = links[0]
    expect(link0).toStrictEqual({
      position: {
        start: 5,
        stop: 31,
      },
      text: {
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: {
          start: 5,
          stop: 31,
        },
        title: "Code général des impôts",
        type: "texte",
      },
      type: "texte",
    })
    expect(context.text(link0.position)).toBe("Le code général des impôts")
    const link1 = links[1]
    expect(link1).toStrictEqual({
      article: {
        implicitText: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 8,
            stop: 31,
          },
          title: "Code général des impôts",
          type: "texte",
        },
        num: "196 B",
        position: {
          start: 100,
          stop: 113,
        },
        type: "article",
      },
      articleId: "LEGIARTI000051212977",
      position: {
        start: 100,
        stop: 113,
      },
      type: "article",
    })
  })

  test("Implicit link to division", async () => {
    const input = dedent`
      I. – Le code général des impôts est ainsi modifié :
      A. – Au chapitre II bis du titre premier de la première partie du livre premier :
    `
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links).toStrictEqual([
      {
        position: {
          start: 5,
          stop: 31,
        },
        text: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          type: "texte",
        },
        type: "texte",
      },
      {
        division: {
          index: 2.002,
          num: "II bis",
          position: {
            start: 60,
            stop: 75,
          },
          type: "chapitre",
        },
        position: {
          start: 60,
          stop: 131,
        },
        sectionTaId: "LEGISCTA000048779194",
        type: "division",
      },
    ])
    expect(context.text(links[0].position)).toBe("Le code général des impôts")
    expect(context.text(links[1].position)).toBe(
      "chapitre II bis du titre premier de la première partie du livre premier",
    )
  })

  test("Link to division", async () => {
    const input = dedent`
      I.- Le chapitre III du titre Ier de la première partie du livre Ier du code général des impôts est complété par une section 0I bis ainsi rédigée :
    `
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links).toStrictEqual([
      {
        division: {
          index: 3,
          num: "III",
          position: {
            start: 7,
            stop: 19,
          },
          type: "chapitre",
        },
        position: {
          start: 7,
          stop: 94,
        },
        sectionTaId: "LEGISCTA000006147020",
        type: "division",
      },
    ])
    expect(context.text(links[0].position)).toBe(
      "chapitre III du titre Ier de la première partie du livre Ier du code général des impôts",
    )
  })
})
