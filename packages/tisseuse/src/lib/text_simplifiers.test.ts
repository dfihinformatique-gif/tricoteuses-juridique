import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import {
  chainConverters,
  convertHtmlElementsToText,
  originalMergedPositionsFromSimplified,
  originalSplitPositionsFromSimplified,
  replacePatterns,
  simplifyHtml,
  simplifyText,
  simplifyUnicodeCharacters,
} from "./text_simplifiers.js"

describe("convertHtmlElementsToText", () => {
  describe("convert doctype to text", () => {
    test("Remove doctype", () => {
      const conversion = convertHtmlElementsToText()(`<!DOCTYPE html>`)
      expect(conversion).toStrictEqual({
        input: "<!DOCTYPE html>",
        output: "",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 15,
            openingTag: "<!DOCTYPE html>",
            outputIndex: 0,
            outputLength: 0,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })

  describe("convert a to text", () => {
    test("Keep a content", () => {
      const conversion = convertHtmlElementsToText()(
        `<a href=".">Hello world!</a>`,
      )
      expect(conversion).toStrictEqual({
        input: '<a href=".">Hello world!</a>',
        output: "Hello world!",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 12,
            matchingSegmentIndex: 1,
            openingTag: '<a href=".">',
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("Remove a", () => {
      const conversion = convertHtmlElementsToText({
        removeAWithHref: true,
      })(`<a href=".">Hello world!</a>`)
      expect(conversion).toStrictEqual({
        input: `<a href=".">Hello world!</a>`,
        output: "",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 28,
            outputIndex: 0,
            outputLength: 0,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("Remove a containing span", () => {
      const conversion = convertHtmlElementsToText({
        removeAWithHref: true,
      })(`<a href="."><span>Hello world!</span></a>`)
      expect(conversion).toStrictEqual({
        input: '<a href="."><span>Hello world!</span></a>',
        output: "",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 41,
            outputIndex: 0,
            outputLength: 0,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })

  describe("convert br to text", () => {
    test("only br without closing /", () => {
      const conversion = convertHtmlElementsToText()("<br>")
      expect(conversion).toStrictEqual({
        input: "<br>",
        output: "\n",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 4,
            openingTag: "<br>",
            outputIndex: 0,
            outputLength: 1,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("only br with closing /", () => {
      const conversion = convertHtmlElementsToText()("<br />")
      expect(conversion).toStrictEqual({
        input: "<br />",
        output: "\n",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 6,
            openingTag: "<br />",
            outputIndex: 0,
            outputLength: 1,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("text and br and text", () => {
      const conversion = convertHtmlElementsToText()("Hello<br>world!")
      expect(conversion).toStrictEqual({
        input: "Hello<br>world!",
        output: "Hello\nworld!",
        sourceMap: [
          {
            inputIndex: 5,
            inputLength: 4,
            openingTag: "<br>",
            outputIndex: 5,
            outputLength: 1,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })

  describe("convert p to text", () => {
    test("only p", () => {
      const conversion = convertHtmlElementsToText()("<p>Hello world!</p>")
      expect(conversion).toStrictEqual({
        input: "<p>Hello world!</p>",
        output: "\nHello world!\n",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 3,
            matchingSegmentIndex: 1,
            openingTag: "<p>",
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })

  describe("convert script to text", () => {
    test("only script", () => {
      const conversion = convertHtmlElementsToText()(
        dedent`
          <script lang="ts">
            const x = Hello world!
          </script>
        `,
      )
      expect(conversion).toStrictEqual({
        input: dedent`
          <script lang="ts">
            const x = Hello world!
          </script>
        `,
        output: "",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 53,
            outputIndex: 0,
            outputLength: 0,
          },
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("html > script", () => {
      const conversion = convertHtmlElementsToText()(
        dedent`
          <html>
            <script lang="ts">
              const x = Hello world!
            </script>
            Hello world!
          </html>
        `,
      )
      expect(conversion).toStrictEqual({
        input: dedent`
          <html>
            <script lang="ts">
              const x = Hello world!
            </script>
            Hello world!
          </html>
        `,
        output: "      Hello world! ",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 6,
            matchingSegmentIndex: 2,
            openingTag: "<html>",
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })

  describe("convert span to text", () => {
    test("only span", () => {
      const conversion = convertHtmlElementsToText()(
        "<span>Hello world!</span>",
      )
      expect(conversion).toStrictEqual({
        input: "<span>Hello world!</span>",
        output: "Hello world!",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 6,
            matchingSegmentIndex: 1,
            openingTag: "<span>",
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("span and text", () => {
      const conversion = convertHtmlElementsToText()(
        "<span>Hello</span> world!",
      )
      expect(conversion).toStrictEqual({
        input: "<span>Hello</span> world!",
        output: "Hello world!",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 6,
            matchingSegmentIndex: 1,
            openingTag: "<span>",
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })

    test("span ending with space and text", () => {
      const conversion = convertHtmlElementsToText()(
        "<span>Hello </span>world!",
      )
      expect(conversion).toStrictEqual({
        input: "<span>Hello </span>world!",
        output: "Hello world!",
        sourceMap: [
          {
            inputIndex: 0,
            inputLength: 6,
            matchingSegmentIndex: 1,
            openingTag: "<span>",
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
        ],
        title: "Conversion des éléments HTML en texte",
      })
    })
  })
})

describe("chainConverters", () => {
  test("multiple spaces and new lines", () => {
    const { output } = chainConverters("Simplification du HTML", [
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
    expect(output).toBe(dedent`
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

describe("originalMergedPositionsFromSimplified", () => {
  test("<div>a <p>first sentence</p>a<p> second sentence</p></div>", ({
    task,
  }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("a\nfirst sentence\na\nsecond sentence")
    const textPosition = { start: 8, stop: 34 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "sentence\na\nsecond sentence",
    )
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        position: {
          start: 7,
          stop: 52,
        },
      },
    ])
    expect(
      html.slice(
        fragmentsReverseConversion[0].position.start,
        fragmentsReverseConversion[0].position.stop,
      ),
    ).toBe("<p>first sentence</p>a<p> second sentence</p>")
  })

  test("<div><p>first sentence</p><p>second sentence</p></div>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("first sentence\nsecond sentence")
    const textPosition0 = { start: 0, stop: 5 }
    expect(text.slice(textPosition0.start, textPosition0.stop)).toBe("first")
    const textPosition1 = { start: 6, stop: 30 }
    expect(text.slice(textPosition1.start, textPosition1.stop)).toBe(
      "sentence\nsecond sentence",
    )
    {
      // Test first HTML position only
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition0],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 8,
            stop: 13,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("first")
    }
    {
      // Test second HTML position only
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition1],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 5,
            stop: 48,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("<p>first sentence</p><p>second sentence</p>")
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition0, textPosition1],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 8,
            stop: 13,
          },
        },
        {
          position: {
            start: 5,
            stop: 48,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("first")
      expect(
        html.slice(
          fragmentsReverseConversion[1].position.start,
          fragmentsReverseConversion[1].position.stop,
        ),
      ).toBe("<p>first sentence</p><p>second sentence</p>")
    }
  })

  test("<div>word1<p>word2 word3</p><p>word4</p></div>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("word1\nword2 word3\nword4")
    const textPosition0 = { start: 0, stop: 11 }
    expect(text.slice(textPosition0.start, textPosition0.stop)).toBe(
      "word1\nword2",
    )
    const textPosition1 = { start: 12, stop: 23 }
    expect(text.slice(textPosition1.start, textPosition1.stop)).toBe(
      "word3\nword4",
    )
    {
      // Test first HTML position only
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition0],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 5,
            stop: 28,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("word1<p>word2 word3</p>")
    }
    {
      // Test second HTML position only
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition1],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 10,
            stop: 40,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("<p>word2 word3</p><p>word4</p>")
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition0, textPosition1],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          position: {
            start: 5,
            stop: 28,
          },
        },
        {
          position: {
            start: 10,
            stop: 40,
          },
        },
      ])
      expect(
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ),
      ).toBe("word1<p>word2 word3</p>")
      expect(
        html.slice(
          fragmentsReverseConversion[1].position.start,
          fragmentsReverseConversion[1].position.stop,
        ),
      ).toBe("<p>word2 word3</p><p>word4</p>")
    }
  })

  test(`<form><input name="dummy" /><span>Hello</span> <b><span>very</span> <span>complex</span></b> <i>world!</i></form>`, ({
    task,
  }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello very complex world!")
    {
      const textPosition = { start: 11, stop: 25 }
      expect(text.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world!",
      )
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          innerPrefix: "<b>",
          outerPrefix: "</b>",
          position: {
            start: 68,
            stop: 106,
          },
        },
      ])
      expect(
        (fragmentsReverseConversion[0].innerPrefix ?? "") +
          html.slice(
            fragmentsReverseConversion[0].position.start,
            fragmentsReverseConversion[0].position.stop,
          ) +
          (fragmentsReverseConversion[0].innerSuffix ?? ""),
      ).toBe("<b><span>complex</span></b> <i>world!</i>")
    }
    {
      const textPosition = { start: 11, stop: 24 }
      expect(text.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world",
      )
      const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
        conversion,
        [textPosition],
      )
      expect(fragmentsReverseConversion).toStrictEqual([
        {
          innerPrefix: "<b>",
          innerSuffix: "</i>",
          outerPrefix: "</b>",
          outerSuffix: "<i>",
          position: {
            start: 68,
            stop: 101,
          },
        },
      ])
      expect(
        (fragmentsReverseConversion[0].innerPrefix ?? "") +
          html.slice(
            fragmentsReverseConversion[0].position.start,
            fragmentsReverseConversion[0].position.stop,
          ) +
          (fragmentsReverseConversion[0].innerSuffix ?? ""),
      ).toBe("<b><span>complex</span></b> <i>world</i>")
    }
  })

  test("<p>Hello <span>world</span>!</p>, detect world", () => {
    const html = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 6, stop: 11 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe("world")
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        position: {
          start: 15,
          stop: 20,
        },
      },
    ])
    expect(
      html.slice(
        fragmentsReverseConversion[0].position.start,
        fragmentsReverseConversion[0].position.stop,
      ),
    ).toBe("world")
  })

  test("<p>Hello <span>world</span>!</p>, detect Hello world!", () => {
    const html = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        position: {
          start: 3,
          stop: 28,
        },
      },
    ])
    expect(
      html.slice(
        fragmentsReverseConversion[0].position.start,
        fragmentsReverseConversion[0].position.stop,
      ),
    ).toBe("Hello <span>world</span>!")
  })

  test("<p>Hello <span>world!</span></p>, detect Hello world!", () => {
    const html = "<p>Hello <span>world!</span></p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        position: {
          start: 3,
          stop: 28,
        },
      },
    ])
    expect(
      html.slice(
        fragmentsReverseConversion[0].position.start,
        fragmentsReverseConversion[0].position.stop,
      ),
    ).toBe("Hello <span>world!</span>")
  })

  test("<span>Au I de l’article</span> 197", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Au I de l'article 197")
    const textPosition = { start: 10, stop: 21 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "article 197",
    )
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        innerPrefix: "<span>",
        outerPrefix: "</span>",
        position: {
          start: 16,
          stop: 34,
        },
      },
    ])
    expect(
      (fragmentsReverseConversion[0].innerPrefix ?? "") +
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ) +
        (fragmentsReverseConversion[0].innerSuffix ?? ""),
    ).toBe("<span>article</span> 197")
  })

  test("<span>Hello world!</span>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 11, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe("!")
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        position: {
          start: 17,
          stop: 18,
        },
      },
    ])
  })

  test(`<span>1° les articles 199 </span><i>decies</i><span> E, 199 </span><i>decies</i><span> EA</span>`, ({
    task,
  }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("1° les articles 199 decies E, 199 decies EA")
    const textPosition = { start: 3, stop: 28 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "les articles 199 decies E",
    )
    const fragmentsReverseConversion = originalMergedPositionsFromSimplified(
      conversion,
      [textPosition],
    )
    expect(fragmentsReverseConversion).toStrictEqual([
      {
        innerPrefix: "<span>",
        innerSuffix: "</span>",
        outerPrefix: "</span>",
        outerSuffix: "<span>",
        position: {
          start: 9,
          stop: 54,
        },
      },
    ])
    expect(
      (fragmentsReverseConversion[0].innerPrefix ?? "") +
        html.slice(
          fragmentsReverseConversion[0].position.start,
          fragmentsReverseConversion[0].position.stop,
        ) +
        (fragmentsReverseConversion[0].innerSuffix ?? ""),
      `<span>199 </span><i>decies</i><span> E</span>`,
    )
  })
})

describe("originalSplitPositionsFromSimplified", () => {
  test("<div>a <p>first sentence</p>a<p> second sentence</p></div>", ({
    task,
  }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("a\nfirst sentence\na\nsecond sentence")
    const textPosition = { start: 8, stop: 34 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "sentence\na\nsecond sentence",
    )
    const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(3)
    expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "sentence",
    )
    expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe("a")
    expect(html.slice(htmlPositions[2].start, htmlPositions[2].stop)).toBe(
      " second sentence",
    )
  })

  test("<div><p>first sentence</p><p>second sentence</p></div>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("first sentence\nsecond sentence")
    const textPosition0 = { start: 0, stop: 5 }
    expect(text.slice(textPosition0.start, textPosition0.stop)).toBe("first")
    const textPosition1 = { start: 6, stop: 30 }
    expect(text.slice(textPosition1.start, textPosition1.stop)).toBe(
      "sentence\nsecond sentence",
    )
    {
      // Test first HTML position only
      const htmlPosition = originalSplitPositionsFromSimplified(conversion, [
        textPosition0,
      ])[0]
      expect(html.slice(htmlPosition.start, htmlPosition.stop)).toBe("first")
    }
    {
      // Test second HTML position only
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "sentence",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        "second sentence",
      )
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition0,
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(3)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "first",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        "sentence",
      )
      expect(html.slice(htmlPositions[2].start, htmlPositions[2].stop)).toBe(
        "second sentence",
      )
    }
  })

  test("<div>word1<p>word2 word3</p><p>word4</p></div>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("word1\nword2 word3\nword4")
    const textPosition0 = { start: 0, stop: 11 }
    expect(text.slice(textPosition0.start, textPosition0.stop)).toBe(
      "word1\nword2",
    )
    const textPosition1 = { start: 12, stop: 23 }
    expect(text.slice(textPosition1.start, textPosition1.stop)).toBe(
      "word3\nword4",
    )
    {
      // Test first HTML position only
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition0,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "word1",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        "word2",
      )
    }
    {
      // Test second HTML position only
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "word3",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        "word4",
      )
    }
    {
      // Test the merging of 2 overlapping HTML positions.
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition0,
        textPosition1,
      ])
      expect(htmlPositions.length).toBe(4)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "word1",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        "word2",
      )
      expect(html.slice(htmlPositions[2].start, htmlPositions[2].stop)).toBe(
        "word3",
      )
      expect(html.slice(htmlPositions[3].start, htmlPositions[3].stop)).toBe(
        "word4",
      )
    }
  })

  test(`<form><input name="dummy" /><span>Hello</span> <b><span>very</span> <span>complex</span></b> <i>world!</i></form>`, ({
    task,
  }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello very complex world!")
    {
      const textPosition = { start: 11, stop: 25 }
      expect(text.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world!",
      )
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition,
      ])
      expect(htmlPositions.length).toBe(2)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "<span>complex</span>",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        " <i>world!</i>",
      )
    }
    {
      const textPosition = { start: 11, stop: 24 }
      expect(text.slice(textPosition.start, textPosition.stop)).toBe(
        "complex world",
      )
      const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
        textPosition,
      ])
      expect(htmlPositions.length).toBe(3)
      expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
        "<span>complex</span>",
      )
      expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
        " ",
      )
      expect(html.slice(htmlPositions[2].start, htmlPositions[2].stop)).toBe(
        "world",
      )
    }
  })

  test("<p>Hello <span>world</span>!</p>, detect world", () => {
    const html = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 6, stop: 11 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe("world")
    const htmlPosition = originalSplitPositionsFromSimplified(conversion, [
      textPosition,
    ])[0]
    expect(html.slice(htmlPosition.start, htmlPosition.stop)).toBe("world")
  })

  test("<p>Hello <span>world</span>!</p>, detect Hello world!", () => {
    const html = "<p>Hello <span>world</span>!</p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const htmlPosition = originalSplitPositionsFromSimplified(conversion, [
      textPosition,
    ])[0]
    expect(html.slice(htmlPosition.start, htmlPosition.stop)).toBe(
      "Hello <span>world</span>!",
    )
  })

  test("<p>Hello <span>world!</span></p>, detect Hello world!", () => {
    const html = "<p>Hello <span>world!</span></p>"
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 0, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "Hello world!",
    )
    const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(1)
    expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "Hello <span>world!</span>",
    )
  })

  test("<span>Au I de l’article</span> 197", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Au I de l'article 197")
    const textPosition = { start: 10, stop: 21 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe(
      "article 197",
    )
    const htmlPositions = originalSplitPositionsFromSimplified(conversion, [
      textPosition,
    ])
    expect(htmlPositions.length).toBe(2)
    expect(html.slice(htmlPositions[0].start, htmlPositions[0].stop)).toBe(
      "article",
    )
    expect(html.slice(htmlPositions[1].start, htmlPositions[1].stop)).toBe(
      " 197",
    )
  })

  test("<span>Hello world!</span>", ({ task }) => {
    const html = task.name
    const conversion = simplifyHtml({ removeAWithHref: true })(html)
    const text = conversion.output
    expect(text).toBe("Hello world!")
    const textPosition = { start: 11, stop: 12 }
    expect(text.slice(textPosition.start, textPosition.stop)).toBe("!")
    const htmlPosition = originalSplitPositionsFromSimplified(conversion, [
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
    const { conversions } = replacePatterns("Loi organique N°1234")
    expect(conversions).toStrictEqual([
      {
        input: "Loi organique N°1234",
        output: "Loi organique N° 1234",
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
    ])
  })
})

describe("simplifyHtml", () => {
  test("PLF ToC link to article title with <a href=…> in <p>", () => {
    const { output } = simplifyHtml({ removeAWithHref: true })(dedent`
      <p class="assnatTOC6">
        <a href="#_Toc179428446" style="text-decoration:none"><span class="assnatHyperlink" style="font-weight:bold; text-decoration:none; color:#000000">ARTICLE</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000"> </span><span class="assnatHyperlink" style="font-weight:bold; text-decoration:none; color:#000000">35</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000"> :</span><span class="assnatHyperlink" style="text-decoration:none; color:#000000">&nbsp; </span><span class="assnatHyperlink" style="text-decoration:none; color:#000000">Versement d’avances remboursables aux collectivités régies par les articles 73, 74 et 76 de la Constitution</span></a>
      </p>
    `)
    expect(output).toBe("")
  })

  test("PLF article 2 title with <a> without href in <h5>", () => {
    const { output } = simplifyHtml({ removeAWithHref: true })(dedent`
      <h5 style="margin-top:18pt; margin-bottom:18pt; font-size:12pt">
				<a id="_Toc179428408"><span style="color:#0070b9">B – Mesures fiscales</span></a><span style="font-size:7.5pt"> </span>
			</h5>
		`)
    expect(output).toBe("B - Mesures fiscales")
  })

  test("PLF article 2 subtitle", () => {
    const { output } = simplifyHtml({ removeAWithHref: true })(dedent`
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
    expect(output).toBe(dedent`
      ARTICLE 2 :
      Indexation sur l'inflation du barème de l'impôt sur le revenu pour les revenus de 2024 et les grilles de taux par défaut du prélèvement à la source
    `)
  })

  test("PLF article 2 first alineas", () => {
    const { output } = simplifyHtml({ removeAWithHref: true })(dedent`
      <p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
			<p class="assnatFPFdebutartexte">
				&nbsp;
			</p>
			<ol class="assnatawlist4" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>I.</span><span>&nbsp;</span><span>-</span><span>&nbsp;</span><span>Le code général des impôts est ainsi modifié</span><span>&nbsp;</span><span>:</span>
				</li>
			</ol>
			<ol start="2" class="assnatawlist3" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>A.</span><span>&nbsp;</span><span>– A la première phrase du second alinéa de l’article 196 B, le montant</span><span>&nbsp;</span><span>: «</span><span>&nbsp;</span><span>6</span><span>&nbsp;</span><span>674</span><span>&nbsp;</span><span>€</span><span>&nbsp;</span><span>» est remplacé par le montant</span><span>&nbsp;</span><span>: «</span><span>&nbsp;</span><span>6</span><span>&nbsp;</span><span>807</span><span>&nbsp;</span><span>€</span><span>&nbsp;</span><span>»</span><span>&nbsp;</span><span>;</span>
				</li>
			</ol>
		`)
    expect(output).toBe(dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé par le montant : « 6 807 € » ;
    `)
  })

  test("PLF article 3 title, subtitle & first alineas", () => {
    const { output } = simplifyHtml({ removeAWithHref: true })(dedent`
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
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>I.- Le chapitre III du titre Ier de la première partie du livre Ier du code général des impôts est complété par une section 0I </span><span class="assnatEmphasis">bis</span><span> ainsi rédigée</span><span>&nbsp;</span><span>:</span>
				</li>
			</ol>
			<ol start="2" class="assnatawlist3" style="margin:0pt; padding-left:0pt">
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>«</span><span>&nbsp;</span><span>Section 0I </span><span class="assnatEmphasis">bis</span>
				</li>
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>«</span><span>&nbsp;</span><span>Contribution différentielle applicable à certains contribuables titulaires de hauts revenus</span>
				</li>
				<li class="assnatFPFprojetloiartexte" style="font-family:Arial; font-size:7pt; color:#0070b9">
					<span style="width:19.79pt; font:7pt 'Times New Roman'; display:inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span>«</span><span>&nbsp;</span><span class="assnatEmphasis">Art. 224</span><span>.
          - I. – Il est institué une contribution à la charge des contribuables
          domiciliés fiscalement en France au sens de l’article 4 B dont le revenu
          du foyer fiscal tel que défini au II est supérieur à 250</span><span>&nbsp;</span><span>000</span><span>&nbsp;</span><span>€ pour les contribuables célibataires, veufs, séparés ou divorcés et à 500</span><span>&nbsp;</span><span>000</span><span>&nbsp;</span><span>€ pour les contribuables soumis à imposition commune.</span>
				</li>
			</ol>
		`)
    expect(output).toBe(dedent`
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
    const conversion = simplifyText(
      "   \n  \n  Hello    world!   \n     \n     \n     ",
    )
    expect(conversion).toStrictEqual({
      conversions: [
        {
          input: "   \n  \n  Hello    world!   \n     \n     \n     ",
          output: " \n \n Hello world! \n \n \n ",
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
          title: "Remplacement des espaces multiples par une espace unique",
        },
        {
          input: " \n \n Hello world! \n \n \n ",
          output: "\n\nHello world! \n\n\n",
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
          input: "\n\nHello world! \n\n\n",
          output: "\n\nHello world!\n\n\n",
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
          input: "\n\nHello world!\n\n\n",
          output: "\nHello world!\n",
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
          input: "\nHello world!\n",
          output: "Hello world!\n",
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
          input: "Hello world!\n",
          output: "Hello world!",
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
      input: "   \n  \n  Hello    world!   \n     \n     \n     ",
      output: "Hello world!",
      title: "Simplification du texte",
    })
  })
})
