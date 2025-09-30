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
        reference: {
          child: {
            child: {
              index: 3,
              num: "III",
              position: {
                start: 3,
                stop: 12,
              },
              type: "livre",
            },
            parent: {
              num: "législative",
              position: {
                start: 19,
                stop: 37,
              },
              type: "partie",
            },
            position: {
              start: 3,
              stop: 37,
            },
            type: "parent-enfant",
          },
          parent: {
            cid: "LEGITEXT000044595989",
            nature: "CODE",
            position: {
              start: 41,
              stop: 87,
            },
            title: "Code des impositions sur les biens et services",
            titleRest: "des impositions sur les biens et services",
            type: "texte",
          },
          position: {
            start: 0,
            stop: 87,
          },
          type: "parent-enfant",
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
        reference: {
          child: {
            index: 3,
            num: "III",
            position: {
              start: 3,
              stop: 12,
            },
            type: "livre",
          },
          parent: {
            cid: "LEGITEXT000044595989",
            nature: "CODE",
            position: {
              start: 16,
              stop: 62,
            },
            title: "Code des impositions sur les biens et services",
            titleRest: "des impositions sur les biens et services",
            type: "texte",
          },
          position: {
            start: 0,
            stop: 62,
          },
          type: "parent-enfant",
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
      reference: {
        child: {
          coordinator: "et",
          left: {
            coordinator: ",",
            left: {
              num: "200 undecies",
              position: {
                start: 0,
                stop: 24,
              },
              type: "article",
            },
            position: {
              start: 0,
              stop: 66,
            },
            right: {
              first: {
                num: "244 quater B",
                position: {
                  start: 39,
                  stop: 51,
                },
                type: "article",
              },
              last: {
                num: "244 quater W",
                position: {
                  start: 54,
                  stop: 66,
                },
                type: "article",
              },
              position: {
                start: 26,
                stop: 66,
              },
              type: "bounded-interval",
            },
            type: "enumeration",
          },
          position: {
            start: 0,
            stop: 92,
          },
          right: {
            coordinator: "et",
            left: {
              num: "27",
              position: {
                start: 83,
                stop: 85,
              },
              type: "article",
            },
            position: {
              start: 74,
              stop: 92,
            },
            right: {
              num: "151",
              position: {
                start: 89,
                stop: 92,
              },
              type: "article",
            },
            type: "enumeration",
          },
          type: "enumeration",
        },
        parent: {
          cid: "JORFTEXT000042753580",
          date: "2020-12-29",
          nature: "LOI",
          num: "2020-1721",
          position: {
            start: 99,
            stop: 135,
          },
          title: "LOI n° 2020-1721 du 29 décembre 2020 de finances pour 2021",
          type: "texte",
        },
        position: {
          start: 0,
          stop: 135,
        },
        type: "parent-enfant",
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
      reference: {
        action: {
          action: "MODIFICATION",
        },
        position: {
          start: 5,
          stop: 49,
        },
        reference: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          titleRest: "général des impôts",
          type: "texte",
        },
        type: "reference_et_action",
      },
      text: {
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: {
          start: 5,
          stop: 31,
        },
        title: "Code général des impôts",
        titleRest: "général des impôts",
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
          titleRest: "général des impôts",
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
      reference: {
        action: {
          action: "MODIFICATION",
          actionInContent: true,
          originalCitations: [
            {
              content: [
                {
                  position: {
                    start: 130,
                    stop: 137,
                  },
                },
              ],
              position: {
                start: 128,
                stop: 139,
              },
              type: "citation",
            },
          ],
        },
        position: {
          start: 57,
          stop: 152,
        },
        reference: {
          child: {
            child: {
              index: 1,
              position: {
                start: 62,
                stop: 77,
              },
              type: "phrase",
            },
            parent: {
              index: 2,
              position: {
                start: 81,
                stop: 94,
              },
              type: "alinéa",
            },
            position: {
              start: 62,
              stop: 94,
            },
            type: "parent-enfant",
          },
          parent: {
            implicitText: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 8,
                stop: 31,
              },
              title: "Code général des impôts",
              titleRest: "général des impôts",
              type: "texte",
            },
            num: "196 B",
            position: {
              start: 100,
              stop: 113,
            },
            type: "article",
          },
          position: {
            start: 57,
            stop: 113,
          },
          type: "parent-enfant",
        },
        type: "reference_et_action",
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
      reference: {
        action: {
          action: "MODIFICATION",
        },
        position: {
          start: 5,
          stop: 49,
        },
        reference: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          titleRest: "général des impôts",
          type: "texte",
        },
        type: "reference_et_action",
      },
      text: {
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: {
          start: 5,
          stop: 31,
        },
        title: "Code général des impôts",
        titleRest: "général des impôts",
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
          titleRest: "général des impôts",
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
      reference: {
        action: {
          action: "MODIFICATION",
          actionInContent: true,
          originalCitations: [
            {
              content: [
                {
                  position: {
                    start: 130,
                    stop: 137,
                  },
                },
              ],
              position: {
                start: 128,
                stop: 139,
              },
              type: "citation",
            },
          ],
        },
        position: {
          start: 57,
          stop: 152,
        },
        reference: {
          child: {
            child: {
              index: 1,
              position: {
                start: 62,
                stop: 77,
              },
              type: "phrase",
            },
            parent: {
              index: 2,
              position: {
                start: 81,
                stop: 94,
              },
              type: "alinéa",
            },
            position: {
              start: 62,
              stop: 94,
            },
            type: "parent-enfant",
          },
          parent: {
            implicitText: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 8,
                stop: 31,
              },
              title: "Code général des impôts",
              titleRest: "général des impôts",
              type: "texte",
            },
            num: "196 B",
            position: {
              start: 100,
              stop: 113,
            },
            type: "article",
          },
          position: {
            start: 57,
            stop: 113,
          },
          type: "parent-enfant",
        },
        type: "reference_et_action",
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
        reference: {
          action: {
            action: "MODIFICATION",
          },
          position: {
            start: 5,
            stop: 49,
          },
          reference: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 5,
              stop: 31,
            },
            title: "Code général des impôts",
            titleRest: "général des impôts",
            type: "texte",
          },
          type: "reference_et_action",
        },
        text: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          titleRest: "général des impôts",
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
        reference: {
          child: {
            child: {
              child: {
                index: 2.002,
                num: "II bis",
                position: {
                  start: 60,
                  stop: 75,
                },
                type: "chapitre",
              },
              parent: {
                index: 1,
                num: "premier",
                position: {
                  start: 79,
                  stop: 92,
                },
                type: "titre",
              },
              position: {
                start: 60,
                stop: 92,
              },
              type: "parent-enfant",
            },
            parent: {
              index: 1,
              num: "première",
              position: {
                start: 99,
                stop: 114,
              },
              type: "partie",
            },
            position: {
              start: 60,
              stop: 114,
            },
            type: "parent-enfant",
          },
          parent: {
            index: 1,
            num: "premier",
            position: {
              start: 118,
              stop: 131,
            },
            type: "livre",
          },
          position: {
            start: 57,
            stop: 131,
          },
          type: "parent-enfant",
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
        reference: {
          num: "223 VO bis",
          position: {
            start: 0,
            stop: 20,
          },
          type: "article",
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
        reference: {
          action: {
            action: "CREATION",
          },
          position: {
            start: 4,
            stop: 107,
          },
          reference: {
            child: {
              child: {
                child: {
                  child: {
                    index: 3,
                    num: "III",
                    position: {
                      start: 7,
                      stop: 19,
                    },
                    type: "chapitre",
                  },
                  parent: {
                    index: 1,
                    num: "Ier",
                    position: {
                      start: 23,
                      stop: 32,
                    },
                    type: "titre",
                  },
                  position: {
                    start: 7,
                    stop: 32,
                  },
                  type: "parent-enfant",
                },
                parent: {
                  index: 1,
                  num: "première",
                  position: {
                    start: 39,
                    stop: 54,
                  },
                  type: "partie",
                },
                position: {
                  start: 7,
                  stop: 54,
                },
                type: "parent-enfant",
              },
              parent: {
                index: 1,
                num: "Ier",
                position: {
                  start: 58,
                  stop: 67,
                },
                type: "livre",
              },
              position: {
                start: 7,
                stop: 67,
              },
              type: "parent-enfant",
            },
            parent: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 71,
                stop: 94,
              },
              title: "Code général des impôts",
              titleRest: "général des impôts",
              type: "texte",
            },
            position: {
              start: 4,
              stop: 94,
            },
            type: "parent-enfant",
          },
          type: "reference_et_action",
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
        reference: {
          action: {
            action: "MODIFICATION",
          },
          position: {
            start: 5,
            stop: 49,
          },
          reference: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 5,
              stop: 31,
            },
            title: "Code général des impôts",
            titleRest: "général des impôts",
            type: "texte",
          },
          type: "reference_et_action",
        },
        text: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          titleRest: "général des impôts",
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
        reference: {
          child: {
            child: {
              child: {
                index: 2.002,
                num: "II bis",
                position: {
                  start: 60,
                  stop: 75,
                },
                type: "chapitre",
              },
              parent: {
                index: 1,
                num: "premier",
                position: {
                  start: 79,
                  stop: 92,
                },
                type: "titre",
              },
              position: {
                start: 60,
                stop: 92,
              },
              type: "parent-enfant",
            },
            parent: {
              index: 1,
              num: "première",
              position: {
                start: 99,
                stop: 114,
              },
              type: "partie",
            },
            position: {
              start: 60,
              stop: 114,
            },
            type: "parent-enfant",
          },
          parent: {
            index: 1,
            num: "premier",
            position: {
              start: 118,
              stop: 131,
            },
            type: "livre",
          },
          position: {
            start: 57,
            stop: 131,
          },
          type: "parent-enfant",
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
            titleRest: "général des impôts",
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
        reference: {
          implicitText: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 8,
              stop: 31,
            },
            title: "Code général des impôts",
            titleRest: "général des impôts",
            type: "texte",
          },
          num: "223 VK",
          position: {
            start: 137,
            stop: 155,
          },
          type: "article",
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
            titleRest: "général des impôts",
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
        reference: {
          action: {
            action: "CREATION",
          },
          position: {
            start: 167,
            stop: 211,
          },
          reference: {
            implicitText: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 8,
                stop: 31,
              },
              title: "Code général des impôts",
              titleRest: "général des impôts",
              type: "texte",
            },
            num: "223 VO quaterdecies",
            position: {
              start: 167,
              stop: 196,
            },
            type: "article",
          },
          type: "reference_et_action",
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
            titleRest: "général des impôts",
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
        reference: {
          child: {
            index: 3,
            num: "3°",
            position: {
              start: 362,
              stop: 364,
            },
            type: "item",
          },
          parent: {
            implicitText: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 8,
                stop: 31,
              },
              title: "Code général des impôts",
              titleRest: "général des impôts",
              type: "texte",
            },
            num: "223 VO bis",
            position: {
              start: 370,
              stop: 388,
            },
            type: "article",
          },
          position: {
            start: 359,
            stop: 388,
          },
          type: "parent-enfant",
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
