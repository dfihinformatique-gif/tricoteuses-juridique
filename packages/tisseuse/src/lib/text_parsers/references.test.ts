import { describe, expect, test } from "vitest"

import type {
  TextAstBoundedInterval,
  TextAstEnumeration,
  TextAstParentChild,
  TextAstReference,
} from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  reference,
  uniteBasePreciseeSingulier,
  uniteBaseSingulier,
} from "./references.js"

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
              id: "199 quater B",
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
                id: "199 undecies B",
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
                    localization: {
                      absolute: -1,
                    },
                    type: "alinéa",
                  },
                  position: {
                    start: 72,
                    stop: 92,
                  },
                  type: "counted-interval",
                },
                parent: {
                  id: "I",
                  index: 1,
                  position: {
                    start: 96,
                    stop: 97,
                  },
                  type: "portion",
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
            id: "238 bis",
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
          id: "107",
          position: {
            start: 126,
            stop: 137,
          },
          type: "article",
        },
        type: "enumeration",
      },
      parent: {
        lawDate: "2021-08-22",
        lawType: "loi",
        num: "2021-1104",
        position: {
          start: 144,
          stop: 176,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 176,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 2021-1104 du 22 août 2021",
    )
    expect(context.textSlice(result.child.position)).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I, à l'article 238 bis et à l'article 107",
    )
    expect(
      context.textSlice((result.child as TextAstEnumeration).left.position),
    ).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I, à l'article 238 bis",
    )
    expect(
      context.textSlice(
        ((result.child as TextAstEnumeration).left as TextAstEnumeration).left
          .position,
      ),
    ).toBe(
      "à l'article 199 quater B, à l'article 199 undecies B, à l'exception des dix derniers alinéas du I",
    )
    expect(
      context.textSlice(
        (
          ((result.child as TextAstEnumeration).left as TextAstEnumeration)
            .left as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("à l'article 199 quater B")
    expect(
      context.textSlice(
        (
          ((result.child as TextAstEnumeration).left as TextAstEnumeration)
            .left as TextAstEnumeration
        ).right.position,
      ),
    ).toBe(
      "à l'article 199 undecies B, à l'exception des dix derniers alinéas du I",
    )
    expect(
      context.textSlice(
        (
          (
            ((result.child as TextAstEnumeration).left as TextAstEnumeration)
              .left as TextAstEnumeration
          ).right as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("à l'article 199 undecies B")
    expect(
      context.textSlice(
        (
          (
            ((result.child as TextAstEnumeration).left as TextAstEnumeration)
              .left as TextAstEnumeration
          ).right as TextAstEnumeration
        ).right.position,
      ),
    ).toBe("des dix derniers alinéas du I")
    expect(
      context.textSlice(
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
      context.textSlice(
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
      context.textSlice(
        ((result.child as TextAstEnumeration).left as TextAstEnumeration).right
          .position,
      ),
    ).toBe("à l'article 238 bis")
    expect(
      context.textSlice((result.child as TextAstEnumeration).right.position),
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
          id: "200 undecies",
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
          id: "151",
          position: {
            start: 32,
            stop: 43,
          },
          type: "article",
        },
        type: "enumeration",
      },
      parent: {
        lawDate: "2020-12-29",
        lawType: "loi",
        num: "2020-1721",
        position: {
          start: 50,
          stop: 86,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 86,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 2020-1721 du 29 décembre 2020",
    )
    expect(context.textSlice(result.child.position)).toBe(
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
            id: "200 undecies",
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
              id: "244 quater B",
              position: {
                start: 39,
                stop: 51,
              },
              type: "article",
            },
            last: {
              id: "244 quater W",
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
            id: "27",
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
            id: "151",
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
        lawDate: "2020-12-29",
        lawType: "loi",
        num: "2020-1721",
        position: {
          start: 99,
          stop: 135,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 135,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 2020-1721 du 29 décembre 2020",
    )
    expect(context.textSlice(result.child.position)).toBe(
      "à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151",
    )
  })

  test("à l'article 7 vicies A de la loi n° 98-293 du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        id: "7 vicies A",
        position: {
          start: 4,
          stop: 22,
        },
        type: "article",
      },
      parent: {
        lawDate: "1998-12-31",
        lawType: "loi",
        num: "98-293",
        position: {
          start: 29,
          stop: 62,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 62,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 98-293 du 31 décembre 1998",
    )
    expect(context.textSlice(result.child.position)).toBe("article 7 vicies A")
  })

  test("à l'article précédent du même code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        localization: {
          relative: -1,
        },
        position: {
          start: 4,
          stop: 21,
        },
        type: "article",
      },
      parent: {
        lawType: "code",
        localization: {
          relative: 0,
        },
        position: {
          start: 25,
          stop: 34,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 34,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("même code")
    expect(context.textSlice(result.child.position)).toBe("article précédent")
  })

  test("à la loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      lawDate: "1998-12-31",
      lawType: "loi",
      num: "98-293",
      position: {
        start: 0,
        stop: 38,
      },
      type: "law",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("au 3°", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "3°",
      index: 3,
      position: {
        start: 0,
        stop: 5,
      },
      type: "portion",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("au 3° du présent article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        id: "3°",
        index: 3,
        position: {
          start: 3,
          stop: 5,
        },
        type: "portion",
      },
      parent: {
        localization: {
          relative: 0,
        },
        position: {
          start: 9,
          stop: 24,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 24,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("présent article")
    expect(context.textSlice(result.child.position)).toBe("3°")
  })

  test("audit article 8-1 bis du présent code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        id: "8-1 bis",
        ofTheSaid: true,
        position: {
          start: 2,
          stop: 21,
        },
        type: "article",
      },
      parent: {
        lawType: "code",
        localization: {
          relative: 0,
        },
        position: {
          start: 25,
          stop: 37,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 37,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("présent code")
    expect(context.textSlice(result.child.position)).toBe("dit article 8-1 bis")
  })

  test("audit article annexe du présent code", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        id: "annexe",
        ofTheSaid: true,
        position: {
          start: 2,
          stop: 20,
        },
        type: "article",
      },
      parent: {
        lawType: "code",
        localization: {
          relative: 0,
        },
        position: {
          start: 24,
          stop: 36,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 36,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("présent code")
    expect(context.textSlice(result.child.position)).toBe("dit article annexe")
  })
  // test("au code pénal", ({ task }) => {
  //   const context = new TextParserContext(task.name)
  //   const result = reference(context) as TextAstReference
  //   expect(result).toStrictEqual({})
  //   expect(context.remaining()).toBe("")
  //   expect(context.textSlice(result.position)).toBe(task.name)
  // })
  // testSingleLink("l'article 7 du code pénal");
  // testSingleLink("à l'article 7 du code pénal");
  // testSingleLink("à l'article 7 bis du code pénal");
  // testSingleLink("à l'article 7 vicies A du code pénal");

  test("aux articles 7 tersexagies A à 9 quaterdecies de la loi n° 98-293 du 31 décembre 1998", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        first: {
          id: "7 tersexagies A",
          position: {
            start: 13,
            stop: 28,
          },
          type: "article",
        },
        last: {
          id: "9 quaterdecies",
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
        lawDate: "1998-12-31",
        lawType: "loi",
        num: "98-293",
        position: {
          start: 52,
          stop: 85,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 85,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 98-293 du 31 décembre 1998",
    )
    expect(context.textSlice(result.child.position)).toBe(
      "articles 7 tersexagies A à 9 quaterdecies",
    )
    expect(
      context.textSlice(
        (result.child as TextAstBoundedInterval).first.position,
      ),
    ).toBe("7 tersexagies A")
    expect(
      context.textSlice((result.child as TextAstBoundedInterval).last.position),
    ).toBe("9 quaterdecies")
  })

  test("aux dix derniers alinéas de l'article 123", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        count: 10,
        first: {
          localization: {
            absolute: -1,
          },
          type: "alinéa",
        },
        position: {
          start: 4,
          stop: 24,
        },
        type: "counted-interval",
      },
      parent: {
        id: "123",
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
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("article 123")
    expect(context.textSlice(result.child.position)).toBe(
      "dix derniers alinéas",
    )
  })

  test("au I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "I",
      index: 1,
      position: {
        start: 0,
        stop: 4,
      },
      type: "portion",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("au i", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "i",
      index: 9,
      position: {
        start: 0,
        stop: 4,
      },
      type: "portion",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  // TODO; Not sure of the result of this one.
  test("au I (troisième alinéa) de l'article 7", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          id: "I",
          index: 1,
          position: {
            start: 3,
            stop: 4,
          },
          type: "portion",
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
        id: "7",
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
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("article 7")
    expect(context.textSlice(result.child.position)).toBe(
      "I (troisième alinéa)",
    )
    // TODO; Not sure of the result of this one.
    expect(
      context.textSlice((result.child as TextAstParentChild).parent.position),
    ).toBe("troisième alinéa")
    expect(
      context.textSlice((result.child as TextAstParentChild).child.position),
    ).toBe("I")
  })

  // TODO; Not sure of the result of this one.
  test("au III (56°) de l'article 7", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        child: {
          id: "III",
          index: 3,
          position: {
            start: 3,
            stop: 6,
          },
          type: "portion",
        },
        parent: {
          id: "56°",
          index: 56,
          position: {
            start: 8,
            stop: 11,
          },
          type: "portion",
        },
        position: {
          start: 3,
          stop: 12,
        },
        type: "parent-enfant",
      },
      parent: {
        id: "7",
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
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe("article 7")
    expect(context.textSlice(result.child.position)).toBe("III (56°)")
    // TODO; Not sure of the result of this one.
    expect(
      context.textSlice((result.child as TextAstParentChild).parent.position),
    ).toBe("56°")
    expect(
      context.textSlice((result.child as TextAstParentChild).child.position),
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
          id: "7",
          position: {
            start: 3,
            stop: 15,
          },
          type: "paragraphe",
        },
        parent: {
          id: "D**7",
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
        lawDate: "1998-02-28",
        lawType: "décret",
        num: "98-74",
        position: {
          start: 38,
          stop: 72,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 72,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "décret n° 98-74 du 28 février 1998",
    )
    expect(context.textSlice(result.child.position)).toBe(
      "paragraphe 7 de l'article D** 7",
    )
    expect(
      context.textSlice((result.child as TextAstParentChild).parent.position),
    ).toBe("article D** 7")
    expect(
      context.textSlice((result.child as TextAstParentChild).child.position),
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
          id: "3",
          position: {
            start: 3,
            stop: 20,
          },
          type: "paragraphe",
        },
        parent: {
          id: "LO7-1",
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
        lawDate: "1998-12-31",
        lawType: "loi",
        position: {
          start: 49,
          stop: 72,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 72,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "loi du 31 décembre 1998",
    )
    expect(context.textSlice(result.child.position)).toBe(
      "sous-paragraphe 3 de l'article L.O. 7-1",
    )
    expect(
      context.textSlice((result.child as TextAstParentChild).parent.position),
    ).toBe("article L.O. 7-1")
    expect(
      context.textSlice((result.child as TextAstParentChild).child.position),
    ).toBe("sous-paragraphe 3")
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
        id: "7 vicies A",
        position: {
          start: 0,
          stop: 18,
        },
        type: "article",
      },
      parent: {
        lawDate: "1998-12-31",
        lawType: "loi",
        num: "98-293",
        position: {
          start: 25,
          stop: 58,
        },
        type: "law",
      },
      position: {
        start: 0,
        stop: 58,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("uniteBaseSingulier", () => {
  test("article 7 vicies A", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBaseSingulier(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "7 vicies A",
      position: {
        start: 0,
        stop: 18,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBaseSingulier(context) as TextAstReference
    expect(result).toStrictEqual({
      lawDate: "1998-12-31",
      lawType: "loi",
      num: "98-293",
      position: {
        start: 0,
        stop: 33,
      },
      type: "law",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})
