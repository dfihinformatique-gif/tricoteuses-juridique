import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"

import { iterTextLinks } from "./text_links.js"

describe("iterTextLinks", () => {
  test("Lien à l'intérieur de la partie législative d'un code", async () => {
    const input =
      "Le livre III de la partie législative du code des impositions sur les biens et services"
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links.length).toBe(1)
    expect(links).toStrictEqual([
      {
        division: {
          index: 3,
          num: "III",
          position: {
            start: 3,
            stop: 12,
          },
          type: "livre",
        },
        position: {
          start: 3,
          stop: 87,
        },
        sectionTaId: "LEGISCTA000044604035",
        type: "external_division",
      },
    ])
    expect(context.text(links[0].position)).toBe(
      "livre III de la partie législative du code des impositions sur les biens et services",
    )
  })

  test("Lien à l'intérieur d'une partie législative implicite d'un code", async () => {
    const input =
      "Le livre III du code des impositions sur les biens et services"
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links.length).toBe(1)
    expect(links).toStrictEqual([
      {
        division: {
          index: 3,
          num: "III",
          position: {
            start: 3,
            stop: 12,
          },
          type: "livre",
        },
        position: {
          start: 3,
          stop: 62,
        },
        sectionTaId: "LEGISCTA000044604035",
        type: "external_division",
      },
    ])
    expect(context.text(links[0].position)).toBe(
      "livre III du code des impositions sur les biens et services",
    )
  })

  test("Lien explicite dans du texte", async () => {
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
      type: "external_article",
    })
    expect(context.text(link3.position)).toBe("27")
  })

  test("Lien implicite dans du HTML", async () => {
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
        titleWithoutDateNatureAndNum: "général des impôts",
        type: "texte",
      },
      type: "external_text",
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
          titleWithoutDateNatureAndNum: "général des impôts",
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
      type: "external_article",
    })
  })

  test("Lien implicite dans du texte", async () => {
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
        titleWithoutDateNatureAndNum: "général des impôts",
        type: "texte",
      },
      type: "external_text",
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
          titleWithoutDateNatureAndNum: "général des impôts",
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
      type: "external_article",
    })
  })

  test("Lien implicite vers une division", async () => {
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
          titleWithoutDateNatureAndNum: "général des impôts",
          type: "texte",
        },
        type: "external_text",
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
        type: "external_division",
      },
    ])
    expect(context.text(links[0].position)).toBe("Le code général des impôts")
    expect(context.text(links[1].position)).toBe(
      "chapitre II bis du titre premier de la première partie du livre premier",
    )
  })

  test("Lien implicite vers l'article 223 VO bis du CGI", async () => {
    const input = "l'article 223 VO bis"
    const context = new TextParserContext(input)
    const links = await Array.fromAsync(
      iterTextLinks(context, {
        date: "2025-07-14",
      }),
    )
    expect(links).toStrictEqual([
      {
        article: {
          num: "223 VO bis",
          position: {
            start: 0,
            stop: 20,
          },
          type: "article",
        },
        articleId: "LEGIARTI000048803814",
        position: {
          start: 0,
          stop: 20,
        },
        type: "external_article",
      },
    ])
    expect(context.text(links[0].position)).toBe("l'article 223 VO bis")
  })

  test("Lien vers une division", async () => {
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
        type: "external_division",
      },
    ])
    expect(context.text(links[0].position)).toBe(
      "chapitre III du titre Ier de la première partie du livre Ier du code général des impôts",
    )
  })

  test("Liens implicites avant et dans une citation du CGI", async () => {
    const input = dedent`
      I. – Le code général des impôts est ainsi modifié :
      A. – Au chapitre II bis du titre premier de la première partie du livre premier :
      1° A l'article 223 VK :
      4° Après l'article 223 VO quaterdecies, il est inséré un article 223 VO quindecies ainsi rédigé :
      « Art. 223 VO quindecies. - Sur option exercée par l'entité constitutive déclarante, et par dérogation au 3° de l'article 223 VO bis, les plus ou moins-values sur participations sont incluses dans le résultat qualifié d'une entité constitutive.
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
          titleWithoutDateNatureAndNum: "général des impôts",
          type: "texte",
        },
        type: "external_text",
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
        type: "external_division",
      },
      {
        article: {
          implicitText: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 8,
              stop: 31,
            },
            title: "Code général des impôts",
            titleWithoutDateNatureAndNum: "général des impôts",
            type: "texte",
          },
          num: "223 VK",
          position: {
            start: 137,
            stop: 155,
          },
          type: "article",
        },
        articleId: "LEGIARTI000051215558",
        position: {
          start: 137,
          stop: 155,
        },
        type: "external_article",
      },
      {
        article: {
          implicitText: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 8,
              stop: 31,
            },
            title: "Code général des impôts",
            titleWithoutDateNatureAndNum: "général des impôts",
            type: "texte",
          },
          num: "223 VO quaterdecies",
          position: {
            start: 167,
            stop: 196,
          },
          type: "article",
        },
        articleId: "LEGIARTI000048803838",
        position: {
          start: 167,
          stop: 196,
        },
        type: "external_article",
      },
      {
        article: {
          implicitText: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 8,
              stop: 31,
            },
            title: "Code général des impôts",
            titleWithoutDateNatureAndNum: "général des impôts",
            type: "texte",
          },
          num: "223 VO bis",
          position: {
            start: 370,
            stop: 388,
          },
          type: "article",
        },
        articleId: "LEGIARTI000048803814",
        position: {
          start: 370,
          stop: 388,
        },
        type: "external_article",
      },
    ])
    expect(context.text(links[0].position)).toBe("Le code général des impôts")
    expect(context.text(links[1].position)).toBe(
      "chapitre II bis du titre premier de la première partie du livre premier",
    )
    expect(context.text(links[2].position)).toBe("A l'article 223 VK")
    expect(context.text(links[3].position)).toBe(
      "l'article 223 VO quaterdecies",
    )
    expect(context.text(links[4].position)).toBe("article 223 VO bis")
  })
})
