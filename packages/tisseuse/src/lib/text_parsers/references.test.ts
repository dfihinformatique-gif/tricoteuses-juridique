import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import type {
  TextAstBoundedInterval,
  TextAstEnumeration,
  TextAstParentChild,
  TextAstReference,
} from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  listeReferencesSeules,
  reference,
  referenceSeule,
  uniteBasePreciseeSingulier,
  uniteBaseSingulier,
} from "./references.js"

describe("listeReferencesSeules", () => {
  test("article 199 quater B", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeReferencesSeules(context) as TextAstReference[]
    expect(result).toStrictEqual([
      {
        num: "199 quater B",
        position: {
          start: 0,
          stop: 20,
        },
        type: "article",
      },
    ])
    expect(context.remaining()).toBe("")
    expect(
      result.map((reference) => context.text(reference.position)),
    ).toStrictEqual(["article 199 quater B"])
  })

  test(
    dedent`
      article 199 quater B
      article 199 undecies B
      article 238 bis
      article 107
    `,
    ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = listeReferencesSeules(context) as TextAstReference[]
      expect(result).toStrictEqual([
        {
          num: "199 quater B",
          position: {
            start: 0,
            stop: 20,
          },
          type: "article",
        },
        {
          num: "199 undecies B",
          position: {
            start: 21,
            stop: 43,
          },
          type: "article",
        },
        {
          num: "238 bis",
          position: {
            start: 44,
            stop: 59,
          },
          type: "article",
        },
        {
          num: "107",
          position: {
            start: 60,
            stop: 71,
          },
          type: "article",
        },
      ])
      expect(context.remaining()).toBe("")
      expect(
        result.map((reference) => context.text(reference.position)),
      ).toStrictEqual([
        "article 199 quater B",
        "article 199 undecies B",
        "article 238 bis",
        "article 107",
      ])
    },
  )

  test("article 199 quater B, article 199 undecies B, article 238 bis, article 107", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = listeReferencesSeules(context) as TextAstReference[]
    expect(result).toStrictEqual([
      {
        num: "199 quater B",
        position: {
          start: 0,
          stop: 20,
        },
        type: "article",
      },
      {
        num: "199 undecies B",
        position: {
          start: 22,
          stop: 44,
        },
        type: "article",
      },
      {
        num: "238 bis",
        position: {
          start: 46,
          stop: 61,
        },
        type: "article",
      },
      {
        num: "107",
        position: {
          start: 63,
          stop: 74,
        },
        type: "article",
      },
    ])
    expect(context.remaining()).toBe("")
    expect(
      result.map((reference) => context.text(reference.position)),
    ).toStrictEqual([
      "article 199 quater B",
      "article 199 undecies B",
      "article 238 bis",
      "article 107",
    ])
  })
})

describe("reference", () => {
  test("à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I, à l'article 238 bis et à l'article 107 de la loi n° 2021-1104 du 22 août 2021", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        coordinator: "et",
        left: {
          coordinator: ",",
          left: {
            coordinator: ",",
            left: {
              num: "199 quater B",
              position: {
                start: 0,
                stop: 24,
              },
              type: "article",
            },
            position: {
              start: 0,
              stop: 97,
            },
            right: {
              left: {
                num: "199 undecies B",
                position: {
                  start: 26,
                  stop: 52,
                },
                type: "article",
              },
              position: {
                start: 26,
                stop: 97,
              },
              right: {
                child: {
                  count: 10,
                  first: {
                    index: -1,
                    num: "derniers",
                    type: "alinéa",
                  },
                  position: {
                    start: 72,
                    stop: 92,
                  },
                  type: "counted-interval",
                },
                parent: {
                  index: 1,
                  num: "I",
                  position: {
                    start: 96,
                    stop: 97,
                  },
                  type: "item",
                },
                position: {
                  start: 68,
                  stop: 97,
                },
                type: "parent-enfant",
              },
              type: "exclusion",
            },
            type: "enumeration",
          },
          position: {
            start: 0,
            stop: 118,
          },
          right: {
            num: "238 bis",
            position: {
              start: 99,
              stop: 118,
            },
            type: "article",
          },
          type: "enumeration",
        },
        position: {
          start: 0,
          stop: 137,
        },
        right: {
          num: "107",
          position: {
            start: 126,
            stop: 137,
          },
          type: "article",
        },
        type: "enumeration",
      },
      parent: {
        cid: "JORFTEXT000043956924",
        date: "2021-08-22",
        nature: "LOI",
        num: "2021-1104",
        position: {
          start: 144,
          stop: 176,
        },
        title:
          "LOI n° 2021-1104 du 22 août 2021 portant lutte contre le dérèglement climatique et renforcement de la résilience face à ses effets",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 176,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.parent.position)).toBe(
      "loi n° 2021-1104 du 22 août 2021",
    )
    expect(context.text(result.child.position)).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I, à l'article 238 bis et à l'article 107",
    )
    expect(
      context.text((result.child as TextAstEnumeration).left.position),
    ).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I, à l'article 238 bis",
    )
    expect(
      context.text(
        ((result.child as TextAstEnumeration).left as TextAstEnumeration).left
          .position,
      ),
    ).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I",
    )
    expect(
      context.text(
        (
          ((result.child as TextAstEnumeration).left as TextAstEnumeration)
            .left as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("à l'article 199 quater B")
    expect(
      context.text(
        (
          ((result.child as TextAstEnumeration).left as TextAstEnumeration)
            .left as TextAstEnumeration
        ).right.position,
      ),
    ).toBe(
      "à l'article 199 undecies B, à l'exception des dix derniers alinéas du I",
    )
    expect(
      context.text(
        (
          (
            ((result.child as TextAstEnumeration).left as TextAstEnumeration)
              .left as TextAstEnumeration
          ).right as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("à l'article 199 undecies B")
    expect(
      context.text(
        (
          (
            ((result.child as TextAstEnumeration).left as TextAstEnumeration)
              .left as TextAstEnumeration
          ).right as TextAstEnumeration
        ).right.position,
      ),
    ).toBe("des dix derniers alinéas du I")
    expect(
      context.text(
        (
          (
            (
              ((result.child as TextAstEnumeration).left as TextAstEnumeration)
                .left as TextAstEnumeration
            ).right as TextAstEnumeration
          ).right as TextAstParentChild
        ).parent.position,
      ),
    ).toBe("I")
    expect(
      context.text(
        (
          (
            (
              ((result.child as TextAstEnumeration).left as TextAstEnumeration)
                .left as TextAstEnumeration
            ).right as TextAstEnumeration
          ).right as TextAstParentChild
        ).child.position,
      ),
    ).toBe("dix derniers alinéas")
    expect(
      context.text(
        ((result.child as TextAstEnumeration).left as TextAstEnumeration).right
          .position,
      ),
    ).toBe("à l'article 238 bis")
    expect(
      context.text((result.child as TextAstEnumeration).right.position),
    ).toBe("article 107")
  })

  test("à l'article 200 undecies et à l'article 151 de la loi n° 2020-1721 du 29 décembre 2020", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        coordinator: "et",
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
          stop: 43,
        },
        right: {
          num: "151",
          position: {
            start: 32,
            stop: 43,
          },
          type: "article",
        },
        type: "enumeration",
      },
      parent: {
        cid: "JORFTEXT000042753580",
        date: "2020-12-29",
        nature: "LOI",
        num: "2020-1721",
        position: {
          start: 50,
          stop: 86,
        },
        title: "LOI n° 2020-1721 du 29 décembre 2020 de finances pour 2021",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 86,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.parent.position)).toBe(
      "loi n° 2020-1721 du 29 décembre 2020",
    )
    expect(context.text(result.child.position)).toBe(
      "à l'article 200 undecies et à l'article 151",
    )
  })

  test("à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151 de la loi n° 2020-1721 du 29 décembre 2020", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
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
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.parent.position)).toBe(
      "loi n° 2020-1721 du 29 décembre 2020",
    )
    expect(context.text(result.child.position)).toBe(
      "à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151",
    )
  })

  test("à l'article 7 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        num: "7",
        position: {
          start: 4,
          stop: 13,
        },
        type: "article",
      },
      parent: {
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        position: {
          start: 17,
          stop: 27,
        },
        title: "Code pénal",
        titleRest: "pénal",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 27,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("à l'article 7 bis du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        num: "7 bis",
        position: {
          start: 4,
          stop: 17,
        },
        type: "article",
      },
      parent: {
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        position: {
          start: 21,
          stop: 31,
        },
        title: "Code pénal",
        titleRest: "pénal",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 31,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("à l'article 7 vicies A de la loi n° 98-293 du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        num: "7 vicies A",
        position: {
          start: 4,
          stop: 22,
        },
        type: "article",
      },
      parent: {
        cid: "JORFTEXT000000743512",
        date: "1998-12-31",
        nature: "LOI",
        num: "98-293",
        position: {
          start: 29,
          stop: 62,
        },
        title:
          "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 62,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe(
      "loi n° 98-293 du 31 décembre 1998",
    )
    expect(context.text(result.child.position)).toBe("article 7 vicies A")
  })

  test("à l'article précédent du même code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        position: {
          start: 4,
          stop: 21,
        },
        relative: -1,
        type: "article",
      },
      parent: {
        nature: "CODE",
        position: {
          start: 25,
          stop: 34,
        },
        relative: 0,
        type: "texte",
      },
      position: {
        start: 0,
        stop: 34,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("même code")
    expect(context.text(result.child.position)).toBe("article précédent")
  })

  test("à la loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      cid: "JORFTEXT000000743512",
      date: "1998-12-31",
      nature: "LOI",
      num: "98-293",
      position: {
        start: 0,
        stop: 38,
      },
      title:
        "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
      type: "texte",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("A la première phrase du quatrième alinéa des articles L. 162-4 et L. 162-5", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        child: {
          child: {
            index: 1,
            position: {
              start: 5,
              stop: 20,
            },
            type: "phrase",
          },
          parent: {
            index: 4,
            position: {
              start: 24,
              stop: 40,
            },
            type: "alinéa",
          },
          position: {
            start: 5,
            stop: 40,
          },
          type: "parent-enfant",
        },
        parent: {
          num: "L162-4",
          position: {
            start: 54,
            stop: 62,
          },
          type: "article",
        },
        position: {
          start: 5,
          stop: 62,
        },
        type: "parent-enfant",
      },
      position: {
        start: 0,
        stop: 74,
      },
      right: {
        child: {
          child: {
            index: 1,
            position: {
              start: 5,
              stop: 20,
            },
            type: "phrase",
          },
          parent: {
            index: 4,
            position: {
              start: 24,
              stop: 40,
            },
            type: "alinéa",
          },
          position: {
            start: 5,
            stop: 40,
          },
          type: "parent-enfant",
        },
        parent: {
          num: "L162-5",
          position: {
            start: 66,
            stop: 74,
          },
          type: "article",
        },
        position: {
          start: 5,
          stop: 74,
        },
        type: "parent-enfant",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("au 3°", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      index: 3,
      num: "3°",
      position: {
        start: 0,
        stop: 5,
      },
      type: "item",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("au 3° du présent article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        index: 3,
        num: "3°",
        position: {
          start: 3,
          stop: 5,
        },
        type: "item",
      },
      parent: {
        position: {
          start: 9,
          stop: 24,
        },
        relative: 0,
        type: "article",
      },
      position: {
        start: 0,
        stop: 24,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("présent article")
    expect(context.text(result.child.position)).toBe("3°")
  })

  test("Au chapitre II bis du titre premier de la première partie du livre premier", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          child: {
            index: 2.002,
            num: "II bis",
            position: {
              start: 3,
              stop: 18,
            },
            type: "chapitre",
          },
          parent: {
            index: 1,
            num: "premier",
            position: {
              start: 22,
              stop: 35,
            },
            type: "titre",
          },
          position: {
            start: 3,
            stop: 35,
          },
          type: "parent-enfant",
        },
        parent: {
          index: 1,
          num: "première",
          position: {
            start: 42,
            stop: 57,
          },
          type: "partie",
        },
        position: {
          start: 3,
          stop: 57,
        },
        type: "parent-enfant",
      },
      parent: {
        index: 1,
        num: "premier",
        position: {
          start: 61,
          stop: 74,
        },
        type: "livre",
      },
      position: {
        start: 0,
        stop: 74,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("au code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      cid: "LEGITEXT000006070719",
      nature: "CODE",
      position: {
        start: 0,
        stop: 13,
      },
      title: "Code pénal",
      titleRest: "pénal",
      type: "texte",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("au même premier alinéa de l'article L. 300-2", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        index: 1,
        position: {
          start: 3,
          stop: 22,
        },
        relative: 0,
        type: "alinéa",
      },
      parent: {
        num: "L300-2",
        position: {
          start: 28,
          stop: 44,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 44,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("audit article 8-1 bis du présent code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        num: "8-1 bis",
        ofTheSaid: true,
        position: {
          start: 2,
          stop: 21,
        },
        type: "article",
      },
      parent: {
        nature: "CODE",
        position: {
          start: 25,
          stop: 37,
        },
        relative: 0,
        type: "texte",
      },
      position: {
        start: 0,
        stop: 37,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("présent code")
    expect(context.text(result.child.position)).toBe("dit article 8-1 bis")
  })

  test("audit article annexe du présent code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        num: "annexe",
        ofTheSaid: true,
        position: {
          start: 2,
          stop: 20,
        },
        type: "article",
      },
      parent: {
        nature: "CODE",
        position: {
          start: 24,
          stop: 36,
        },
        relative: 0,
        type: "texte",
      },
      position: {
        start: 0,
        stop: 36,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("présent code")
    expect(context.text(result.child.position)).toBe("dit article annexe")
  })

  test("aux articles 7 tersexagies A à 9 quaterdecies de la loi n° 98-293 du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        first: {
          num: "7 tersexagies A",
          position: {
            start: 13,
            stop: 28,
          },
          type: "article",
        },
        last: {
          num: "9 quaterdecies",
          position: {
            start: 31,
            stop: 45,
          },
          type: "article",
        },
        position: {
          start: 4,
          stop: 45,
        },
        type: "bounded-interval",
      },
      parent: {
        cid: "JORFTEXT000000743512",
        date: "1998-12-31",
        nature: "LOI",
        num: "98-293",
        position: {
          start: 52,
          stop: 85,
        },
        title:
          "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 85,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe(
      "loi n° 98-293 du 31 décembre 1998",
    )
    expect(context.text(result.child.position)).toBe(
      "articles 7 tersexagies A à 9 quaterdecies",
    )
    expect(
      context.text((result.child as TextAstBoundedInterval).first.position),
    ).toBe("7 tersexagies A")
    expect(
      context.text((result.child as TextAstBoundedInterval).last.position),
    ).toBe("9 quaterdecies")
  })

  test("aux dix derniers alinéas de l'article 123", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        count: 10,
        first: {
          index: -1,
          num: "derniers",
          type: "alinéa",
        },
        position: {
          start: 4,
          stop: 24,
        },
        type: "counted-interval",
      },
      parent: {
        num: "123",
        position: {
          start: 30,
          stop: 41,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 41,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("article 123")
    expect(context.text(result.child.position)).toBe("dix derniers alinéas")
  })

  test("au I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      index: 1,
      num: "I",
      position: {
        start: 0,
        stop: 4,
      },
      type: "item",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("au i", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      index: 9,
      num: "i",
      position: {
        start: 0,
        stop: 4,
      },
      type: "item",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  // TODO; Not sure of the result of this one.
  test("au I (troisième alinéa) de l'article 7", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 1,
          num: "I",
          position: {
            start: 3,
            stop: 4,
          },
          type: "item",
        },
        parent: {
          index: 3,
          position: {
            start: 6,
            stop: 22,
          },
          type: "alinéa",
        },
        position: {
          start: 3,
          stop: 23,
        },
        type: "parent-enfant",
      },
      parent: {
        num: "7",
        position: {
          start: 29,
          stop: 38,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 38,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("article 7")
    expect(context.text(result.child.position)).toBe("I (troisième alinéa)")
    // TODO; Not sure of the result of this one.
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("troisième alinéa")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("I")
  })

  // TODO; Not sure of the result of this one.
  test("au III (56°) de l'article 7", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 3,
          num: "III",
          position: {
            start: 3,
            stop: 6,
          },
          type: "item",
        },
        parent: {
          index: 56,
          num: "56°",
          position: {
            start: 8,
            stop: 11,
          },
          type: "item",
        },
        position: {
          start: 3,
          stop: 12,
        },
        type: "parent-enfant",
      },
      parent: {
        num: "7",
        position: {
          start: 18,
          stop: 27,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 27,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("article 7")
    expect(context.text(result.child.position)).toBe("III (56°)")
    // TODO; Not sure of the result of this one.
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("56°")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("III")
  })

  test("au paragraphe 7 de l'article D** 7 du décret n° 98-74 du 28 février 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 7,
          num: "7",
          position: {
            start: 3,
            stop: 15,
          },
          type: "paragraphe",
        },
        parent: {
          num: "D**7",
          position: {
            start: 21,
            stop: 34,
          },
          type: "article",
        },
        position: {
          start: 3,
          stop: 34,
        },
        type: "parent-enfant",
      },
      parent: {
        date: "1998-02-28",
        nature: "DECRET",
        num: "98-74",
        position: {
          start: 38,
          stop: 72,
        },
        type: "texte",
      },
      position: {
        start: 0,
        stop: 72,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe(
      "décret n° 98-74 du 28 février 1998",
    )
    expect(context.text(result.child.position)).toBe(
      "paragraphe 7 de l'article D** 7",
    )
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("article D** 7")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("paragraphe 7")
  })

  test("au sous-paragraphe 3 de l'article L.O. 7-1 de la loi du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 3,
          num: "3",
          position: {
            start: 3,
            stop: 20,
          },
          type: "sous-paragraphe",
        },
        parent: {
          num: "LO7-1",
          position: {
            start: 26,
            stop: 42,
          },
          type: "article",
        },
        position: {
          start: 3,
          stop: 42,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "JORFTEXT000000743512",
        date: "1998-12-31",
        nature: "LOI",
        position: {
          start: 49,
          stop: 72,
        },
        title:
          "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 72,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("loi du 31 décembre 1998")
    expect(context.text(result.child.position)).toBe(
      "sous-paragraphe 3 de l'article L.O. 7-1",
    )
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("article L.O. 7-1")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("sous-paragraphe 3")
  })

  test("du V du même article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        index: 5,
        num: "V",
        position: {
          start: 3,
          stop: 4,
        },
        type: "item",
      },
      parent: {
        position: {
          start: 8,
          stop: 20,
        },
        relative: 0,
        type: "article",
      },
      position: {
        start: 0,
        stop: 20,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("même article")
    expect(context.text(result.child.position)).toBe("V")
  })

  test("l'article 43 de la loi de finances pour 2000 (n° 99-1172 du 30 décembre 1999)", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        num: "43",
        position: {
          start: 2,
          stop: 12,
        },
        type: "article",
      },
      parent: {
        cid: "JORFTEXT000000762233",
        date: "1999-12-30",
        nature: "LOI",
        num: "99-1172",
        position: {
          start: 19,
          stop: 77,
        },
        title: "Loi n° 99-1172 du 30 décembre 1999 de finances pour 2000",
        titleRest: "de finances pour 2000",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 77,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("l'article 49, alinéa 3, de la Constitution", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 3,
          position: {
            start: 14,
            stop: 22,
          },
          type: "alinéa",
        },
        parent: {
          num: "49",
          position: {
            start: 10,
            stop: 12,
          },
          type: "article",
        },
        position: {
          start: 2,
          stop: 23,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "JORFTEXT000000571356",
        nature: "CONSTITUTION",
        position: {
          start: 30,
          stop: 42,
        },
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 42,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("l'article 49, alinéas 2 et 3, de la Constitution", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          coordinator: "et",
          left: {
            index: 2,
            position: {
              start: 14,
              stop: 23,
            },
            type: "alinéa",
          },
          position: {
            start: 14,
            stop: 28,
          },
          right: {
            index: 3,
            position: {
              start: 27,
              stop: 28,
            },
            type: "alinéa",
          },
          type: "enumeration",
        },
        parent: {
          num: "49",
          position: {
            start: 10,
            stop: 12,
          },
          type: "article",
        },
        position: {
          start: 2,
          stop: 29,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "JORFTEXT000000571356",
        nature: "CONSTITUTION",
        position: {
          start: 36,
          stop: 48,
        },
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 48,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("article 49, alinéa 3, de la Constitution", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = referenceSeule(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          index: 3,
          position: {
            start: 12,
            stop: 20,
          },
          type: "alinéa",
        },
        parent: {
          num: "49",
          position: {
            start: 8,
            stop: 10,
          },
          type: "article",
        },
        position: {
          start: 0,
          stop: 21,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "JORFTEXT000000571356",
        nature: "CONSTITUTION",
        position: {
          start: 28,
          stop: 40,
        },
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 40,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("article 49, alinéas 1, 2 et 3, de la Constitution", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = referenceSeule(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          coordinator: "et",
          left: {
            coordinator: ",",
            left: {
              index: 1,
              position: {
                start: 12,
                stop: 21,
              },
              type: "alinéa",
            },
            position: {
              start: 12,
              stop: 24,
            },
            right: {
              index: 2,
              position: {
                start: 23,
                stop: 24,
              },
              type: "alinéa",
            },
            type: "enumeration",
          },
          position: {
            start: 12,
            stop: 29,
          },
          right: {
            index: 3,
            position: {
              start: 28,
              stop: 29,
            },
            type: "alinéa",
          },
          type: "enumeration",
        },
        parent: {
          num: "49",
          position: {
            start: 8,
            stop: 10,
          },
          type: "article",
        },
        position: {
          start: 0,
          stop: 30,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "JORFTEXT000000571356",
        nature: "CONSTITUTION",
        position: {
          start: 37,
          stop: 49,
        },
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 49,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("article L. 123-4, phrases 1 et 2, du code de l'éducation", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = referenceSeule(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        child: {
          coordinator: "et",
          left: {
            index: 1,
            position: {
              start: 18,
              stop: 27,
            },
            type: "phrase",
          },
          position: {
            start: 18,
            stop: 32,
          },
          right: {
            index: 2,
            position: {
              start: 31,
              stop: 32,
            },
            type: "phrase",
          },
          type: "enumeration",
        },
        parent: {
          num: "L123-4",
          position: {
            start: 8,
            stop: 16,
          },
          type: "article",
        },
        position: {
          start: 0,
          stop: 33,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "LEGITEXT000006071191",
        nature: "CODE",
        position: {
          start: 37,
          stop: 56,
        },
        title: "Code de l'éducation",
        titleRest: "de l'éducation",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 56,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("l'article 61 de la loi du 31 décembre 1937, l'article 57 de la loi du 31 décembre 1938", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: ",",
      left: {
        child: {
          num: "61",
          position: {
            start: 2,
            stop: 12,
          },
          type: "article",
        },
        parent: {
          date: "1937-12-31",
          nature: "LOI",
          position: {
            start: 19,
            stop: 42,
          },
          type: "texte",
        },
        position: {
          start: 0,
          stop: 42,
        },
        type: "parent-enfant",
      },
      position: {
        start: 0,
        stop: 86,
      },
      right: {
        child: {
          num: "57",
          position: {
            start: 46,
            stop: 56,
          },
          type: "article",
        },
        parent: {
          date: "1938-12-31",
          nature: "LOI",
          position: {
            start: 63,
            stop: 86,
          },
          type: "texte",
        },
        position: {
          start: 44,
          stop: 86,
        },
        type: "parent-enfant",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe(
      "l'article 61 de la loi du 31 décembre 1937",
    )
    expect(context.text(result.right.position)).toBe(
      "l'article 57 de la loi du 31 décembre 1938",
    )
  })

  test("l'article 7 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      child: {
        num: "7",
        position: {
          start: 2,
          stop: 11,
        },
        type: "article",
      },
      parent: {
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        position: {
          start: 15,
          stop: 25,
        },
        title: "Code pénal",
        titleRest: "pénal",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 25,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Le chapitre III du titre Ier de la première partie du livre Ier du code général des impôts", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          child: {
            child: {
              index: 3,
              num: "III",
              position: {
                start: 3,
                stop: 15,
              },
              type: "chapitre",
            },
            parent: {
              index: 1,
              num: "Ier",
              position: {
                start: 19,
                stop: 28,
              },
              type: "titre",
            },
            position: {
              start: 3,
              stop: 28,
            },
            type: "parent-enfant",
          },
          parent: {
            index: 1,
            num: "première",
            position: {
              start: 35,
              stop: 50,
            },
            type: "partie",
          },
          position: {
            start: 3,
            stop: 50,
          },
          type: "parent-enfant",
        },
        parent: {
          index: 1,
          num: "Ier",
          position: {
            start: 54,
            stop: 63,
          },
          type: "livre",
        },
        position: {
          start: 3,
          stop: 63,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        position: {
          start: 67,
          stop: 90,
        },
        title: "Code général des impôts",
        titleRest: "général des impôts",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 90,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe("code général des impôts")
    expect(context.text(result.child.position)).toBe(
      "chapitre III du titre Ier de la première partie du livre Ier",
    )
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("livre Ier")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("chapitre III du titre Ier de la première partie")
    expect(
      context.text(
        ((result.child as TextAstParentChild).child as TextAstParentChild)
          .parent.position,
      ),
    ).toBe("première partie")
    expect(
      context.text(
        ((result.child as TextAstParentChild).child as TextAstParentChild).child
          .position,
      ),
    ).toBe("chapitre III du titre Ier")
    expect(
      context.text(
        (
          ((result.child as TextAstParentChild).child as TextAstParentChild)
            .child as TextAstParentChild
        ).parent.position,
      ),
    ).toBe("titre Ier")
    expect(
      context.text(
        (
          ((result.child as TextAstParentChild).child as TextAstParentChild)
            .child as TextAstParentChild
        ).child.position,
      ),
    ).toBe("chapitre III")
  })

  test("le décret du 31 août 1937, l'article 61 de la loi du 31 décembre 1937, l'article 57 de la loi du 31 décembre 1938", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: ",",
      left: {
        coordinator: ",",
        left: {
          date: "1937-08-31",
          nature: "DECRET",
          position: {
            start: 0,
            stop: 25,
          },
          type: "texte",
        },
        position: {
          start: 0,
          stop: 69,
        },
        right: {
          child: {
            num: "61",
            position: {
              start: 29,
              stop: 39,
            },
            type: "article",
          },
          parent: {
            date: "1937-12-31",
            nature: "LOI",
            position: {
              start: 46,
              stop: 69,
            },
            type: "texte",
          },
          position: {
            start: 27,
            stop: 69,
          },
          type: "parent-enfant",
        },
        type: "enumeration",
      },
      position: {
        start: 0,
        stop: 113,
      },
      right: {
        child: {
          num: "57",
          position: {
            start: 73,
            stop: 83,
          },
          type: "article",
        },
        parent: {
          date: "1938-12-31",
          nature: "LOI",
          position: {
            start: 90,
            stop: 113,
          },
          type: "texte",
        },
        position: {
          start: 71,
          stop: 113,
        },
        type: "parent-enfant",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe(
      "le décret du 31 août 1937, l'article 61 de la loi du 31 décembre 1937",
    )
    expect(context.text(result.right.position)).toBe(
      "l'article 57 de la loi du 31 décembre 1938",
    )
    expect(
      context.text((result.left as TextAstEnumeration).left.position),
    ).toBe("le décret du 31 août 1937")
    expect(
      context.text((result.left as TextAstEnumeration).right.position),
    ).toBe("l'article 61 de la loi du 31 décembre 1937")
  })

  test("le décret du 31 août 1937, l'article 61 de la loi du 31 décembre 1937, l'article 57 de la loi du 31 décembre 1938 et la loi du 18 mars 1944", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        coordinator: ",",
        left: {
          coordinator: ",",
          left: {
            date: "1937-08-31",
            nature: "DECRET",
            position: {
              start: 0,
              stop: 25,
            },
            type: "texte",
          },
          position: {
            start: 0,
            stop: 69,
          },
          right: {
            child: {
              num: "61",
              position: {
                start: 29,
                stop: 39,
              },
              type: "article",
            },
            parent: {
              date: "1937-12-31",
              nature: "LOI",
              position: {
                start: 46,
                stop: 69,
              },
              type: "texte",
            },
            position: {
              start: 27,
              stop: 69,
            },
            type: "parent-enfant",
          },
          type: "enumeration",
        },
        position: {
          start: 0,
          stop: 113,
        },
        right: {
          child: {
            num: "57",
            position: {
              start: 73,
              stop: 83,
            },
            type: "article",
          },
          parent: {
            date: "1938-12-31",
            nature: "LOI",
            position: {
              start: 90,
              stop: 113,
            },
            type: "texte",
          },
          position: {
            start: 71,
            stop: 113,
          },
          type: "parent-enfant",
        },
        type: "enumeration",
      },
      position: {
        start: 0,
        stop: 139,
      },
      right: {
        date: "1944-03-18",
        nature: "LOI",
        position: {
          start: 117,
          stop: 139,
        },
        type: "texte",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe(
      "le décret du 31 août 1937, l'article 61 de la loi du 31 décembre 1937, l'article 57 de la loi du 31 décembre 1938",
    )
    expect(context.text(result.right.position)).toBe("la loi du 18 mars 1944")
    expect(
      context.text((result.left as TextAstEnumeration).left.position),
    ).toBe(
      "le décret du 31 août 1937, l'article 61 de la loi du 31 décembre 1937",
    )
    expect(
      context.text((result.left as TextAstEnumeration).right.position),
    ).toBe("l'article 57 de la loi du 31 décembre 1938")
    expect(
      context.text(
        ((result.left as TextAstEnumeration).left as TextAstEnumeration).left
          .position,
      ),
    ).toBe("le décret du 31 août 1937")
    expect(
      context.text(
        ((result.left as TextAstEnumeration).left as TextAstEnumeration).right
          .position,
      ),
    ).toBe("l'article 61 de la loi du 31 décembre 1937")
  })

  test("Le II de la section II du chapitre III du titre II du livre des procédures fiscales", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          child: {
            child: {
              index: 2,
              num: "II",
              position: {
                start: 3,
                stop: 5,
              },
              type: "item",
            },
            parent: {
              index: 2,
              num: "II",
              position: {
                start: 12,
                stop: 22,
              },
              type: "section",
            },
            position: {
              start: 3,
              stop: 22,
            },
            type: "parent-enfant",
          },
          parent: {
            index: 3,
            num: "III",
            position: {
              start: 26,
              stop: 38,
            },
            type: "chapitre",
          },
          position: {
            start: 3,
            stop: 38,
          },
          type: "parent-enfant",
        },
        parent: {
          index: 2,
          num: "II",
          position: {
            start: 42,
            stop: 50,
          },
          type: "titre",
        },
        position: {
          start: 3,
          stop: 50,
        },
        type: "parent-enfant",
      },
      parent: {
        cid: "LEGITEXT000006069583",
        nature: "CODE",
        position: {
          start: 54,
          stop: 83,
        },
        title: "Livre des procédures fiscales",
        titleRest: "des procédures fiscales",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 83,
      },
      type: "parent-enfant",
    })
  })

  test("Le livre III de la partie législative du code des impositions sur les biens et services", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
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
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.parent.position)).toBe(
      "code des impositions sur les biens et services",
    )
    expect(context.text(result.child.position)).toBe(
      "livre III de la partie législative",
    )
    expect(
      context.text((result.child as TextAstParentChild).parent.position),
    ).toBe("partie législative")
    expect(
      context.text((result.child as TextAstParentChild).child.position),
    ).toBe("livre III")
  })
})

describe("referenceSeule", () => {
  test("article 107 de la loi n° 2021-1104 du 22 août 2021", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = referenceSeule(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        num: "107",
        position: {
          start: 0,
          stop: 11,
        },
        type: "article",
      },
      parent: {
        cid: "JORFTEXT000043956924",
        date: "2021-08-22",
        nature: "LOI",
        num: "2021-1104",
        position: {
          start: 18,
          stop: 50,
        },
        title:
          "LOI n° 2021-1104 du 22 août 2021 portant lutte contre le dérèglement climatique et renforcement de la résilience face à ses effets",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 50,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})

describe("uniteBasePreciseeSingulier", () => {
  test("article 7 vicies A de la loi n° 98-293 du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBasePreciseeSingulier(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        num: "7 vicies A",
        position: {
          start: 0,
          stop: 18,
        },
        type: "article",
      },
      parent: {
        cid: "JORFTEXT000000743512",
        date: "1998-12-31",
        nature: "LOI",
        num: "98-293",
        position: {
          start: 25,
          stop: 58,
        },
        title:
          "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 58,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})

describe("uniteBaseSingulier", () => {
  test("article 7 vicies A", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBaseSingulier(context) as TextAstReference
    expect(result).toStrictEqual({
      num: "7 vicies A",
      position: {
        start: 0,
        stop: 18,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBaseSingulier(context) as TextAstReference
    expect(result).toStrictEqual({
      cid: "JORFTEXT000000743512",
      date: "1998-12-31",
      nature: "LOI",
      num: "98-293",
      position: {
        start: 0,
        stop: 33,
      },
      title:
        "Loi n° 98-1313 du 31 décembre 1998 relative à la validation législative d'actes pris après avis du comité technique paritaire du ministère des affaires étrangères",
      type: "texte",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})
