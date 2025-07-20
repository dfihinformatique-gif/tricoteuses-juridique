import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import {
  chainSimplifiers,
  convertHtmlElementsToText,
  replacePatterns,
  simplifyHtml,
  simplifyText,
  type ConversionTaskLeaf,
} from "./text_simplifiers.js"

describe("convertHtmlElementsToText", () => {
  describe("convert a to text", () => {
    test("Keep a content", () => {
      const { task, text } = convertHtmlElementsToText()(
        `<a href=".">Hello world!</a>`,
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 12,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 24,
          inputLength: 4,
          outputIndex: 12,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("Hello world!")
    })

    test("Remove a", () => {
      const { task, text } = convertHtmlElementsToText({
        removeAWithHref: true,
      })(`<a href=".">Hello world!</a>`)
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 28,
          outputIndex: 0,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("")
    })

    test("Remove a containing span", () => {
      const { task, text } = convertHtmlElementsToText({
        removeAWithHref: true,
      })(`<a href="."><span>Hello world!</span></a>`)
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 41,
          outputIndex: 0,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("")
    })
  })

  describe("convert br to text", () => {
    test("only br without closing /", () => {
      const { task, text } = convertHtmlElementsToText()("<br>")
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 4,
          outputIndex: 0,
          outputLength: 1,
        },
      ])
      expect(text).toStrictEqual("\n")
    })
    test("only br with closing /", () => {
      const { task, text } = convertHtmlElementsToText("<br />")
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          outputIndex: 0,
          outputLength: 1,
        },
      ])
      expect(text).toStrictEqual("\n")
    })
    test("text and br and text", () => {
      const { task, text } = convertHtmlElementsToText("Hello<br>world!")
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 5,
          inputLength: 4,
          outputIndex: 5,
          outputLength: 1,
        },
      ])
      expect(text).toStrictEqual("Hello\nworld!")
    })
  })

  describe("convert p to text", () => {
    test("only p", () => {
      const { task, text } = convertHtmlElementsToText("<p>Hello world!</p>")
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 3,
          outputIndex: 0,
          outputLength: 1,
        },
        {
          inputIndex: 15,
          inputLength: 4,
          outputIndex: 13,
          outputLength: 1,
        },
      ])
      expect(text).toStrictEqual("\nHello world!\n")
    })
  })

  describe("convert script to text", () => {
    test("only script", () => {
      const { task, text } = convertHtmlElementsToText(
        dedent`
          <script lang="ts">
            const x = Hello world!
          </script>
        `,
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 53,
          outputIndex: 0,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("")
    })

    test("html > script", () => {
      const { task, text } = convertHtmlElementsToText(
        dedent`
          <html>
            <script lang="ts">
              const x = Hello world!
            </script>
            Hello world!
          </html>
        `,
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 9,
          inputLength: 57,
          outputIndex: 3,
          outputLength: 0,
        },
        {
          inputIndex: 82,
          inputLength: 7,
          outputIndex: 19,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("\n  \n  Hello world!\n")
    })
  })

  describe("convert span to text", () => {
    test("only span", () => {
      const { task, text } = convertHtmlElementsToText(
        "<span>Hello world!</span>",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 18,
          inputLength: 7,
          outputIndex: 12,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("Hello world!")
    })

    test("span and text", () => {
      const { task, text } = convertHtmlElementsToText(
        "<span>Hello</span> world!",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 11,
          inputLength: 7,
          outputIndex: 5,
          outputLength: 0,
        },
      ])
      expect(text).toBe("Hello world!")
    })

    test("span ending with space and text", () => {
      const { task, text } = convertHtmlElementsToText(
        "<span>Hello </span>world!",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 12,
          inputLength: 7,
          outputIndex: 6,
          outputLength: 0,
        },
      ])
      expect(text).toBe("Hello world!")
    })
  })
})

describe("chainSimplifiers", () => {
  test("multiple spaces and new lines", () => {
    const { text } = chainSimplifiers(
      "Simplification du HTML",
      [replacePatterns, convertHtmlElementsToText, simplifyText],
      dedent`
        <br/>Le titre II du livre III du code des postes et des communications électroniques est ainsi modifié : <br/>1° L'article L. 130 est ainsi modifié : <br/>a) A la première phrase du premier alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » et, après les mots : «, des postes », sont insérés les mots : «, de la distribution de la presse » ; <br/>b) Au quatrième alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ; <br/>c) La première phrase du cinquième alinéa est complétée par les mots : « du présent code et à l'article 24 de la loi n° 47-585 du 2 avril 1947 relative au statut des entreprises de groupage et de distribution des journaux et publications périodiques » ; <br/>d) Le sixième alinéa est ainsi modifié :</p>
        <p>
        <br/>-après la première phrase, est insérée une phrase ainsi rédigée : « Dans les mêmes conditions, ils ne prennent pas part aux délibérations et décisions de l'autorité adoptées au titre de l'article 20, du 1° de l'article 24 et de l'article 25 de la loi n° 47-585 du 2 avril 1947 précitée. » ;<br/>-la seconde phrase est complétée par les mots : « du présent code et à l'article 22 de la loi n° 47-585 du 2 avril 1947 précitée » ; </p>
        <p>
        <br/>e) Le septième alinéa est ainsi modifié :</p>
        <p>
        <br/>-à la première phrase, après la référence : « L. 36-11 », sont insérés les mots : « du présent code et au titre de l'article 20, du 1° de l'article 24 et de l'article 25 de la loi n° 47-585 du 2 avril 1947 précitée » ;<br/>-la seconde phrase est complétée par les mots : « du présent code et de l'article 22 de la loi n° 47-585 du 2 avril 1947 précitée » ; </p>
        <p>
        <br/>2° L'article L. 131 est ainsi modifié : <br/>a) Au premier alinéa, à la première phrase, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » et, à la deuxième phrase, après les mots : « de l'audiovisuel », sont insérés les mots : «, de la presse » ; <br/>b) Au deuxième alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ; <br/>3° L'article L. 135 est ainsi modifié : <br/>a) A la fin du premier alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ; <br/>b) Après le 1°, il est inséré un 1° bis ainsi rédigé : <br/>« 1° bis Présente les mesures relatives à la distribution de la presse qui ont été mises en œuvre en application du titre III de la loi n° 47-585 du 2 avril 1947 relative au statut des entreprises de groupage et de distribution des journaux et publications périodiques ; » <br/>c) Après le 3°, il est inséré un 3° bis ainsi rédigé : <br/>« 3° bis Dresse l'état de la distribution de la presse, notamment s'agissant de l'évolution des prestations proposées par les sociétés agréées de distribution de la presse, de leurs prix et de la couverture du territoire par les réseaux de distribution ; rend compte de l'application des dispositions du même titre III, en proposant, le cas échéant, des modifications de nature législative ou réglementaire qu'elle estime appropriées ; » <br/>d) L'avant-dernier alinéa est ainsi modifié :</p>
        <p>
        <br/>-à la fin de la première phrase, les mots : « le secteur des communications électroniques et sur celui des postes » sont remplacés par les mots : « les secteurs des communications électroniques, des postes et de la distribution de la presse » ;<br/>-à la deuxième phrase, après la référence : « L. 33-1 », sont insérés les mots : « du présent code et les sociétés agréées mentionnées à l'article 3 de la loi n° 47-585 du 2 avril 1947 précitée ».</p>
      `,
    )
    expect(text).toBe(dedent`
      Le titre II du livre III du code des postes et des communications électroniques est ainsi modifié :
      1° L'article L. 130 est ainsi modifié :
      a) A la première phrase du premier alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » et, après les mots : «, des postes », sont insérés les mots : «, de la distribution de la presse » ;
      b) Au quatrième alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ;
      c) La première phrase du cinquième alinéa est complétée par les mots : « du présent code et à l'article 24 de la loi n° 47-585 du 2 avril 1947 relative au statut des entreprises de groupage et de distribution des journaux et publications périodiques » ;
      d) Le sixième alinéa est ainsi modifié :
      -après la première phrase, est insérée une phrase ainsi rédigée : « Dans les mêmes conditions, ils ne prennent pas part aux délibérations et décisions de l'autorité adoptées au titre de l'article 20, du 1° de l'article 24 et de l'article 25 de la loi n° 47-585 du 2 avril 1947 précitée. » ;
      -la seconde phrase est complétée par les mots : « du présent code et à l'article 22 de la loi n° 47-585 du 2 avril 1947 précitée » ;
      e) Le septième alinéa est ainsi modifié :
      -à la première phrase, après la référence : « L. 36-11 », sont insérés les mots : « du présent code et au titre de l'article 20, du 1° de l'article 24 et de l'article 25 de la loi n° 47-585 du 2 avril 1947 précitée » ;
      -la seconde phrase est complétée par les mots : « du présent code et de l'article 22 de la loi n° 47-585 du 2 avril 1947 précitée » ;
      2° L'article L. 131 est ainsi modifié :
      a) Au premier alinéa, à la première phrase, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » et, à la deuxième phrase, après les mots : « de l'audiovisuel », sont insérés les mots : «, de la presse » ;
      b) Au deuxième alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ;
      3° L'article L. 135 est ainsi modifié :
      a) A la fin du premier alinéa, les mots : « et des postes » sont remplacés par les mots : «, des postes et de la distribution de la presse » ;
      b) Après le 1°, il est inséré un 1° bis ainsi rédigé :
      « 1° bis Présente les mesures relatives à la distribution de la presse qui ont été mises en œuvre en application du titre III de la loi n° 47-585 du 2 avril 1947 relative au statut des entreprises de groupage et de distribution des journaux et publications périodiques ; »
      c) Après le 3°, il est inséré un 3° bis ainsi rédigé :
      « 3° bis Dresse l'état de la distribution de la presse, notamment s'agissant de l'évolution des prestations proposées par les sociétés agréées de distribution de la presse, de leurs prix et de la couverture du territoire par les réseaux de distribution ; rend compte de l'application des dispositions du même titre III, en proposant, le cas échéant, des modifications de nature législative ou réglementaire qu'elle estime appropriées ; »
      d) L'avant-dernier alinéa est ainsi modifié :
      -à la fin de la première phrase, les mots : « le secteur des communications électroniques et sur celui des postes » sont remplacés par les mots : « les secteurs des communications électroniques, des postes et de la distribution de la presse » ;
      -à la deuxième phrase, après la référence : « L. 33-1 », sont insérés les mots : « du présent code et les sociétés agréées mentionnées à l'article 3 de la loi n° 47-585 du 2 avril 1947 précitée ».
    `)
  })
})

describe("replacePatterns", () => {
  test("add space after n°", () => {
    const { task, text } = replacePatterns("Loi organique N°1234")
    expect(task).toStrictEqual({
      sourceMap: [
        {
          inputIndex: 13,
          inputLength: 4,
          outputIndex: 13,
          outputLength: 5,
        },
      ],
      title:
        "Suppression des commentaires HTML et remplacement des caractères unicodes",
    })
    expect(text).toBe("Loi organique N° 1234")
  })
})

describe("simplifyText", () => {
  test("multiple spaces and new lines", () => {
    const { task, text } = simplifyText(
      "   \n  \n  Hello    world!   \n     \n     \n     ",
    )
    expect(task).toStrictEqual({
      tasks: [
        {
          sourceMap: [
            {
              inputIndex: 0,
              inputLength: 3,
              outputIndex: 0,
              outputLength: 1,
            },
            {
              inputIndex: 4,
              inputLength: 2,
              outputIndex: 2,
              outputLength: 1,
            },
            {
              inputIndex: 7,
              inputLength: 2,
              outputIndex: 4,
              outputLength: 1,
            },
            {
              inputIndex: 14,
              inputLength: 4,
              outputIndex: 10,
              outputLength: 1,
            },
            {
              inputIndex: 24,
              inputLength: 3,
              outputIndex: 17,
              outputLength: 1,
            },
            {
              inputIndex: 28,
              inputLength: 5,
              outputIndex: 19,
              outputLength: 1,
            },
            {
              inputIndex: 34,
              inputLength: 5,
              outputIndex: 21,
              outputLength: 1,
            },
            {
              inputIndex: 40,
              inputLength: 5,
              outputIndex: 23,
              outputLength: 1,
            },
          ],
          title: "Remplacement des espaces multiples pas une espace unique",
        },
        {
          sourceMap: [
            {
              inputIndex: 0,
              inputLength: 1,
              outputIndex: 0,
              outputLength: 0,
            },
            {
              inputIndex: 2,
              inputLength: 1,
              outputIndex: 1,
              outputLength: 0,
            },
            {
              inputIndex: 4,
              inputLength: 1,
              outputIndex: 2,
              outputLength: 0,
            },
            {
              inputIndex: 19,
              inputLength: 1,
              outputIndex: 16,
              outputLength: 0,
            },
            {
              inputIndex: 21,
              inputLength: 1,
              outputIndex: 17,
              outputLength: 0,
            },
            {
              inputIndex: 23,
              inputLength: 1,
              outputIndex: 18,
              outputLength: 0,
            },
          ],
          title: "Suppression d'une espace en début de ligne",
        },
        {
          sourceMap: [
            {
              inputIndex: 14,
              inputLength: 1,
              outputIndex: 14,
              outputLength: 0,
            },
          ],
          title: "Suppression d'une espace en fin de ligne",
        },
        {
          sourceMap: [
            {
              inputIndex: 0,
              inputLength: 2,
              outputIndex: 0,
              outputLength: 1,
            },
            {
              inputIndex: 14,
              inputLength: 3,
              outputIndex: 13,
              outputLength: 1,
            },
          ],
          title:
            "Remplacement des sauts de lignes multiples par un saut de ligne unique",
        },
        {
          sourceMap: [
            {
              inputIndex: 0,
              inputLength: 1,
              outputIndex: 0,
              outputLength: 0,
            },
          ],
          title: "Suppression d'un saut de ligne en début de texte",
        },
        {
          sourceMap: [
            {
              inputIndex: 12,
              inputLength: 1,
              outputIndex: 12,
              outputLength: 0,
            },
          ],
          title: "Suppression d'un saut de ligne en fin de texte",
        },
      ],
      title: "Simplification du texte",
    })
    expect(text).toStrictEqual("Hello world!")
  })
})
