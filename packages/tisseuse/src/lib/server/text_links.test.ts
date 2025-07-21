import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_simplifiers.js"

import { iterTextLinks } from "./text_links.js"

describe("iterTextLinks", () => {
  test("test 1", async () => {
    const conversion = simplifyHtml({ removeAWithHref: true })(dedent`
      à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151 de la loi n° 2020-1721 du 29 décembre 2020
    `)
    const input = conversion.text
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
      text: {
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
      type: "article",
    })
    expect(context.text(link3.position)).toBe("27")
  })
})
