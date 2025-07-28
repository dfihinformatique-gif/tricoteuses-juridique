import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import {
  chainSimplifiers,
  convertHtmlElementsToText,
  originalPositionsFromSimplified,
  replacePatterns,
  simplifyHtml,
  simplifyText,
  simplifyUnicodeCharacters,
  type ConversionTaskLeaf,
} from "./text_simplifiers.js"

describe("convertHtmlElementsToText", () => {
  describe("convert doctype to text", () => {
    test("Remove doctype", () => {
      const { task, text } = convertHtmlElementsToText()(`<!DOCTYPE html>`)
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 15,
          outputIndex: 0,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("")
    })
  })

  describe("convert a to text", () => {
    test("Keep a content", () => {
      const { task, text } = convertHtmlElementsToText()(
        `<a href=".">Hello world!</a>`,
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 12,
          matchingSegmentIndex: 1,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 24,
          inputLength: 4,
          matchingSegmentIndex: 0,
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
      const { task, text } = convertHtmlElementsToText()("<br />")
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
      const { task, text } = convertHtmlElementsToText()("Hello<br>world!")
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
      const { task, text } = convertHtmlElementsToText()("<p>Hello world!</p>")
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 3,
          matchingSegmentIndex: 1,
          outputIndex: 0,
          outputLength: 1,
        },
        {
          inputIndex: 15,
          inputLength: 4,
          matchingSegmentIndex: 0,
          outputIndex: 13,
          outputLength: 1,
        },
      ])
      expect(text).toStrictEqual("\nHello world!\n")
    })
  })

  describe("convert script to text", () => {
    test("only script", () => {
      const { task, text } = convertHtmlElementsToText()(
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
      const { task, text } = convertHtmlElementsToText()(
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
          matchingSegmentIndex: 2,
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
          matchingSegmentIndex: 0,
          outputIndex: 19,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("      Hello world! ")
    })
  })

  describe("convert span to text", () => {
    test("only span", () => {
      const { task, text } = convertHtmlElementsToText()(
        "<span>Hello world!</span>",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          matchingSegmentIndex: 1,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 18,
          inputLength: 7,
          matchingSegmentIndex: 0,
          outputIndex: 12,
          outputLength: 0,
        },
      ])
      expect(text).toStrictEqual("Hello world!")
    })

    test("span and text", () => {
      const { task, text } = convertHtmlElementsToText()(
        "<span>Hello</span> world!",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          matchingSegmentIndex: 1,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 11,
          inputLength: 7,
          matchingSegmentIndex: 0,
          outputIndex: 5,
          outputLength: 0,
        },
      ])
      expect(text).toBe("Hello world!")
    })

    test("span ending with space and text", () => {
      const { task, text } = convertHtmlElementsToText()(
        "<span>Hello </span>world!",
      )
      expect((task as ConversionTaskLeaf).sourceMap).toStrictEqual([
        {
          inputIndex: 0,
          inputLength: 6,
          matchingSegmentIndex: 1,
          outputIndex: 0,
          outputLength: 0,
        },
        {
          inputIndex: 12,
          inputLength: 7,
          matchingSegmentIndex: 0,
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
    const { text } = chainSimplifiers("Simplification du HTML", [
      simplifyUnicodeCharacters,
      convertHtmlElementsToText(),
      simplifyText,
    ])(
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

describe("originalPositionsFromSimplified", () => {
  test("<div>a <p>first sentence</p>a<p> second sentence</p></div>", ({
    task,
  }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("a\nfirst sentence\na\nsecond sentence")
    const textPosition = { start: 8, stop: 34 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
      "sentence\na\nsecond sentence",
    )
    const htmlPositions = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(3)
    expect(inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "sentence",
    )
    expect(inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
      "a",
    )
    expect(inputHtml.slice(htmlPositions[2].start, htmlPositions[2].stop)).toBe(
      " second sentence",
    )
  })

  test("<div><p>first sentence</p><p>second sentence</p></div>", ({ task }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("first sentence\nsecond sentence")
    const textPosition0 = { start: 0, stop: 5 }
    expect(inputText.slice(textPosition0.start, textPosition0.stop)).toBe(
      "first",
    )
    const textPosition1 = { start: 6, stop: 30 }
    expect(inputText.slice(textPosition1.start, textPosition1.stop)).toBe(
      "sentence\nsecond sentence",
    )
    {
      // Test first HTML position only
      const htmlPosition = originalPositionsFromSimplified(conversion.task, [
        textPosition0,
      ])[0]
      expect(inputHtml.slice(htmlPosition.start, htmlPosition.stop)).toBe(
        "first",
      )
    }
    {
      // Test second HTML position only
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("sentence")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe("second sentence")
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition0,
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(3)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("first")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe("sentence")
      expect(
        inputHtml.slice(htmlPositions[2].start, htmlPositions[2].stop),
      ).toBe("second sentence")
    }
  })

  test("<div>word1<p>word2 word3</p><p>word4</p></div>", ({ task }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("word1\nword2 word3\nword4")
    const textPosition0 = { start: 0, stop: 11 }
    expect(inputText.slice(textPosition0.start, textPosition0.stop)).toBe(
      "word1\nword2",
    )
    const textPosition1 = { start: 12, stop: 23 }
    expect(inputText.slice(textPosition1.start, textPosition1.stop)).toBe(
      "word3\nword4",
    )
    {
      // Test first HTML position only
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition0,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("word1")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe("word2")
    }
    {
      // Test second HTML position only
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("word3")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe("word4")
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition0,
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(4)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("word1")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe("word2")
      expect(
        inputHtml.slice(htmlPositions[2].start, htmlPositions[2].stop),
      ).toBe("word3")
      expect(
        inputHtml.slice(htmlPositions[3].start, htmlPositions[3].stop),
      ).toBe("word4")
    }
  })

  test(`<form><input name="dummy" /><span>Hello</span> <b><span>very</span> <span>complex</span></b> <i>world!</i></form>`, ({
    task,
  }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Hello very complex world!")
    {
      const textPosition = { start: 11, stop: 25 }
      expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world!",
      )
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("<span>complex</span>")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe(" <i>world!</i>")
    }
    {
      const textPosition = { start: 11, stop: 24 }
      expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world",
      )
      const htmlPositions = originalPositionsFromSimplified(conversion.task, [
        textPosition,
      ])
      expect(htmlPositions.length).toBe(3)
      expect(
        inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop),
      ).toBe("<span>complex</span>")
      expect(
        inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop),
      ).toBe(" ")
      expect(
        inputHtml.slice(htmlPositions[2].start, htmlPositions[2].stop),
      ).toBe("world")
    }
  })

  test("<p>Hello <span>world</span>!</p>, detect world", () => {
    const inputHtml = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Hello world!")
    const textPosition = { start: 6, stop: 11 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe("world")
    const htmlPosition = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])[0]
    expect(inputHtml.slice(htmlPosition.start, htmlPosition.stop)).toBe("world")
  })

  test("<p>Hello <span>world</span>!</p>, detect Hello world!", () => {
    const inputHtml = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const htmlPosition = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])[0]
    expect(inputHtml.slice(htmlPosition.start, htmlPosition.stop)).toBe(
      "Hello <span>world</span>!",
    )
  })

  test("<p>Hello <span>world!</span></p>, detect Hello world!", () => {
    const inputHtml = "<p>Hello <span>world!</span></p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const htmlPositions = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(1)
    expect(inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "Hello <span>world!</span>",
    )
  })

  test("<span>Au I de l’article</span> 197", ({ task }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Au I de l'article 197")
    const textPosition = { start: 10, stop: 21 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe(
      "article 197",
    )
    const htmlPositions = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(2)
    expect(inputHtml.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "article",
    )
    expect(inputHtml.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
      " 197",
    )
  })

  test("<span>Hello world!</span>", ({ task }) => {
    const inputHtml = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(inputHtml)
    const inputText = conversion.text
    expect(inputText).toBe("Hello world!")
    const textPosition = { start: 11, stop: 12 }
    expect(inputText.slice(textPosition.start, textPosition.stop)).toBe("!")
    const htmlPosition = originalPositionsFromSimplified(conversion.task, [
      textPosition,
    ])[0]
    expect(htmlPosition).toStrictEqual({
      start: 17,
      stop: 18,
    })
  })
})

describe("replacePatterns", () => {
  test("add space after n°", () => {
    const { task, text } = replacePatterns("Loi organique N°1234")
    expect(task).toStrictEqual({
      tasks: [
        {
          sourceMap: [
            {
              inputIndex: 13,
              inputLength: 4,
              outputIndex: 13,
              outputLength: 5,
            },
          ],
          title: 'Remplacement de /(\\sn°)([^\\s])/gi par "$1 $2"',
        },
      ],
      title:
        "Suppression des commentaires, scripts et styles HTML et nettoyage d'expressions",
    })
    expect(text).toBe("Loi organique N° 1234")
  })
})

describe("simplifyHtml", () => {
  test("PLF ToC link to article title with <a href=…> in <p>", () => {
    const { text } = simplifyHtml({ removeAWithHref: true })(dedent`
      <p class="assnatTOC6">
        <a href="#_Toc179428446" style="text-decoration:none"><span class="assnatHyperlink" style="font-weight:bold; text-decoration:none; color:#000000">ARTICLE</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000"> </span><span class="assnatHyperlink" style="font-weight:bold; text-decoration:none; color:#000000">35</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000"> :</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000">&nbsp; </span><span class="assnatHyperlink" style="text-decoration:none; color:#000000">Versement d’avances remboursables aux collectivités régies par les articles 73, 74 et 76 de la Constitution</span></a>
      </p>
    `)
    expect(text).toBe("")
  })

  test("PLF article 2 title with <a> without href in <h5>", () => {
    const { text } = simplifyHtml({ removeAWithHref: true })(dedent`
      <h5 style="margin-top:18pt; margin-bottom:18pt; font-size:12pt">
				<a id="_Toc179428408"><span style="color:#0070b9">B – Mesures fiscales</span></a><span style="font-size:7.5pt"> </span>
			</h5>
		`)
    expect(text).toBe("B - Mesures fiscales")
  })

  test("PLF article 2 subtitle", () => {
    const { text } = simplifyHtml({ removeAWithHref: true })(dedent`
      <table style="width:100%; padding:0pt; border-collapse:collapse">
				<tbody><tr>
					<td style="width:497.5pt; border-left:0.75pt solid #0070b9; border-bottom:0.75pt solid #0070b9; padding:0pt 0pt 1.4pt 1.02pt; vertical-align:middle">
						<h6 style="margin:1pt 1pt 1pt 4pt; line-height:13pt">
							<a id="_Toc179428409"><span style="font-size:10pt; font-weight:bold; color:#0070b9">ARTICLE</span> <span style="font-size:10pt; font-weight:bold; color:#0070b9">2</span> <span style="color:#ffffff">: </span><br><span style="font-size:10pt; color:#0070b9">Indexation
    sur l’inflation du barème de l’impôt sur le revenu pour les revenus de
    2024 et les grilles de taux par défaut du prélèvement à la source</span></a>
						</h6>
					</td>
				</tr>
			</tbody></table>
		`)
    expect(text).toBe(dedent`
      ARTICLE 2 :
      Indexation sur l'inflation du barème de l'impôt sur le revenu pour les revenus de 2024 et les grilles de taux par défaut du prélèvement à la source
    `)
  })

  test("PLF article 2 first alineas", () => {
    const { text } = simplifyHtml({ removeAWithHref: true })(dedent`
      <p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
			<p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
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
    expect(text).toBe(dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé par le montant : « 6 807 € » ;
    `)
  })

  test("PLF article 3 title, subtitle & first alineas", () => {
    const { text } = simplifyHtml({ removeAWithHref: true })(dedent`
      <div class="assnatSection27">
			<table style="width:100%; padding:0pt; border-collapse:collapse">
				<tbody><tr>
					<td style="width:497.5pt; border-left:0.75pt solid #0070b9; border-bottom:0.75pt solid #0070b9; padding:0pt 0pt 1.4pt 1.02pt; vertical-align:middle">
						<h6 style="margin:1pt 1pt 1pt 4pt; line-height:13pt">
							<a id="_Toc179428410"><span style="font-size:10pt; font-weight:bold; color:#0070b9">ARTICLE</span> <span style="font-size:10pt; font-weight:bold; color:#0070b9">3</span> <span style="color:#ffffff">: </span><br><span style="font-size:10pt; color:#0070b9">Instauration d'une contribution différentielle sur les hauts revenus</span></a>
						</h6>
					</td>
				</tr>
			</tbody></table>
			<p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
			<p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
			<ol class="assnatawlist8" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">I.- Le chapitre III du titre Ier de la première partie du livre Ier du code général des impôts est complété par une section 0I </span><span class="assnatEmphasis" style="font-family:Marianne; font-size:9pt; color:#000000">bis</span><span style="font-family:Marianne; font-size:9pt; color:#000000"> ainsi rédigée</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">:</span>
				</li>
			</ol>
			<ol start="2" class="assnatawlist3" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">«</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">Section 0I </span><span class="assnatEmphasis" style="font-family:Marianne; font-size:9pt; color:#000000">bis</span>
				</li>
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">«</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">Contribution différentielle applicable à certains contribuables titulaires de hauts revenus</span>
				</li>
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-family:Marianne; font-size:9pt; color:#000000">«</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span class="assnatEmphasis" style="font-family:Marianne; font-size:9pt; color:#000000">Art. 224</span><span style="font-family:Marianne; font-size:9pt; color:#000000">.
          - I. – Il est institué une contribution à la charge des contribuables
          domiciliés fiscalement en France au sens de l’article 4 B dont le revenu
          du foyer fiscal tel que défini au II est supérieur à 250</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">000</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">€ pour les contribuables célibataires, veufs, séparés ou divorcés et à 500</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">000</span><span style="font-family:Marianne; font-size:9pt; color:#000000">&nbsp;</span><span style="font-family:Marianne; font-size:9pt; color:#000000">€ pour les contribuables soumis à imposition commune.</span>
				</li>
			</ol>
		`)
    expect(text).toBe(dedent`
      ARTICLE 3 :
      Instauration d'une contribution différentielle sur les hauts revenus
      I.- Le chapitre III du titre Ier de la première partie du livre Ier du code général des impôts est complété par une section 0I bis ainsi rédigée :
      « Section 0I bis
      « Contribution différentielle applicable à certains contribuables titulaires de hauts revenus
      « Art. 224. - I. - Il est institué une contribution à la charge des contribuables domiciliés fiscalement en France au sens de l'article 4 B dont le revenu du foyer fiscal tel que défini au II est supérieur à 250 000 € pour les contribuables célibataires, veufs, séparés ou divorcés et à 500 000 € pour les contribuables soumis à imposition commune.
    `)
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
