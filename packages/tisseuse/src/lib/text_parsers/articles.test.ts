import { describe, expect, test } from "vitest"

import {
  type TextAstArticle,
  type TextAstBoundedInterval,
  type TextAstEnumeration,
  type TextAstParentChild,
} from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  article,
  articles,
  designationArticle,
  listeArticles,
  nomArticle,
  nomSpecialArticle,
  typeArticle,
} from "./articles.js"

describe("article", () => {
  test("article L. 325-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L325-3",
      position: {
        start: 0,
        stop: 16,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dit article L. 325-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L325-3",
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 20,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dit même article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 16,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dit même article L. 325-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L325-3",
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 25,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("même article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 12,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("même article L. 325-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = article(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L325-3",
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 21,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("articles", () => {
  test("articles L. 325-3 et L. 325-4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        position: {
          start: 9,
          stop: 17,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 29,
      },
      right: {
        num: "L325-4",
        position: {
          start: 21,
          stop: 29,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("L. 325-4")
  })

  test("dits articles L. 325-3 et L. 325-4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        ofTheSaid: true,
        position: {
          start: 14,
          stop: 22,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 34,
      },
      right: {
        num: "L325-4",
        ofTheSaid: true,
        position: {
          start: 26,
          stop: 34,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("L. 325-4")
  })

  test("dits mêmes articles", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstArticle
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 19,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dits mêmes articles L. 325-3 et L. 325-4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        localization: {
          relative: 0,
        },
        ofTheSaid: true,
        position: {
          start: 20,
          stop: 28,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 40,
      },
      right: {
        num: "L325-4",
        localization: {
          relative: 0,
        },
        ofTheSaid: true,
        position: {
          start: 32,
          stop: 40,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("L. 325-4")
  })

  test("mêmes articles", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstArticle
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 14,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("mêmes articles L. 325-3 et L. 325-4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = articles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        localization: {
          relative: 0,
        },
        position: {
          start: 15,
          stop: 23,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 35,
      },
      right: {
        num: "L325-4",
        localization: {
          relative: 0,
        },
        position: {
          start: 27,
          stop: 35,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("L. 325-4")
  })
})

describe("designationArticle", () => {
  test("L 325-5-1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L325-5-1",
      position: {
        start: 0,
        stop: 9,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("L. 3 bis-0", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "L3 bis-0",
      position: {
        start: 0,
        stop: 10,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("L.O. 325-3 ci-après", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstArticle
    expect(result).toStrictEqual({
      num: "LO325-3",
      localizationAdverb: "ci-après",
      position: {
        start: 0,
        stop: 19,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("L.O. 325-3 ci-après (3° à 5°)", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        first: {
          index: 3,
          num: "3°",
          position: {
            start: 21,
            stop: 23,
          },
          type: "partie",
        },
        last: {
          index: 5,
          num: "5°",
          position: {
            start: 26,
            stop: 28,
          },
          type: "partie",
        },
        position: {
          start: 21,
          stop: 28,
        },
        type: "bounded-interval",
      },
      parent: {
        num: "LO325-3",
        localizationAdverb: "ci-après",
        position: {
          start: 0,
          stop: 19,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 29,
      },
      type: "parent-enfant",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "L.O. 325-3 ci-après",
    )
    expect(context.textSlice(result.child.position)).toBe("3° à 5°")
    expect(
      context.textSlice(
        (result.child as TextAstBoundedInterval).first.position,
      ),
    ).toBe("3°")
    expect(
      context.textSlice((result.child as TextAstBoundedInterval).last.position),
    ).toBe("5°")
  })

  test("L.O. 325-3 ci-après (troisième alinéa)", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstParentChild
    expect(result).toStrictEqual({
      child: {
        index: 3,
        position: {
          start: 21,
          stop: 37,
        },
        type: "alinéa",
      },
      parent: {
        num: "LO325-3",
        localizationAdverb: "ci-après",
        position: {
          start: 0,
          stop: 19,
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
    expect(context.textSlice(result.parent.position)).toBe(
      "L.O. 325-3 ci-après",
    )
    expect(context.textSlice(result.child.position)).toBe("troisième alinéa")
  })

  test("même", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationArticle(context) as TextAstArticle
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 4,
      },
      type: "article",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("listeArticles", () => {
  test("L. 325-3 à L. 325-5-1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeArticles(context) as TextAstBoundedInterval
    expect(result).toStrictEqual({
      first: {
        num: "L325-3",
        position: {
          start: 0,
          stop: 8,
        },
        type: "article",
      },
      last: {
        num: "L325-5-1",
        position: {
          start: 11,
          stop: 21,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 21,
      },
      type: "bounded-interval",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.first.position)).toBe("L. 325-3")
    expect(context.textSlice(result.last.position)).toBe("L. 325-5-1")
  })

  test("L. 325-3 et L. 325-5-1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeArticles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        position: {
          start: 0,
          stop: 8,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 22,
      },
      right: {
        num: "L325-5-1",
        position: {
          start: 12,
          stop: 22,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("L. 325-5-1")
  })

  test("L. 325-3 et suivants", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeArticles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        num: "L325-3",
        position: {
          start: 0,
          stop: 8,
        },
        type: "article",
      },
      position: {
        start: 0,
        stop: 20,
      },
      right: {
        localization: {
          relative: "+∞",
        },
        position: {
          start: 12,
          stop: 20,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 325-3")
    expect(context.textSlice(result.right.position)).toBe("suivants")
  })

  test("L. 400 bis, L. 425-3 et L. 456", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeArticles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        coordinator: ",",
        left: {
          num: "L400 bis",
          position: {
            start: 0,
            stop: 10,
          },
          type: "article",
        },
        position: {
          start: 0,
          stop: 20,
        },
        right: {
          num: "L425-3",
          position: {
            start: 12,
            stop: 20,
          },
          type: "article",
        },
        type: "enumeration",
      },
      position: {
        start: 0,
        stop: 30,
      },
      right: {
        num: "L456",
        position: {
          start: 24,
          stop: 30,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("L. 400 bis, L. 425-3")
    expect(
      context.textSlice((result.left as TextAstEnumeration).left.position),
    ).toBe("L. 400 bis")
    expect(
      context.textSlice((result.left as TextAstEnumeration).right.position),
    ).toBe("L. 425-3")
    expect(context.textSlice(result.right.position)).toBe("L. 456")
  })

  test("L. 400 bis, L. 425-3 à L. 425-5-1 et L. 456", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = listeArticles(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        coordinator: ",",
        left: {
          num: "L400 bis",
          position: {
            start: 0,
            stop: 10,
          },
          type: "article",
        },
        position: {
          start: 0,
          stop: 33,
        },
        right: {
          first: {
            num: "L425-3",
            position: {
              start: 12,
              stop: 20,
            },
            type: "article",
          },
          last: {
            num: "L425-5-1",
            position: {
              start: 23,
              stop: 33,
            },
            type: "article",
          },
          position: {
            start: 12,
            stop: 33,
          },
          type: "bounded-interval",
        },
        type: "enumeration",
      },
      position: {
        start: 0,
        stop: 43,
      },
      right: {
        num: "L456",
        position: {
          start: 37,
          stop: 43,
        },
        type: "article",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe(
      "L. 400 bis, L. 425-3 à L. 425-5-1",
    )
    expect(
      context.textSlice((result.left as TextAstEnumeration).left.position),
    ).toBe("L. 400 bis")
    expect(
      context.textSlice((result.left as TextAstEnumeration).right.position),
    ).toBe("L. 425-3 à L. 425-5-1")
    expect(
      context.textSlice(
        ((result.left as TextAstEnumeration).right as TextAstBoundedInterval)
          .first.position,
      ),
    ).toBe("L. 425-3")
    expect(
      context.textSlice(
        ((result.left as TextAstEnumeration).right as TextAstBoundedInterval)
          .last.position,
      ),
    ).toBe("L. 425-5-1")
    expect(context.textSlice(result.right.position)).toBe("L. 456")
  })
})

describe("nomArticle", () => {
  test("1er", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("1")
    expect(context.remaining()).toBe("")
  })

  test("3.1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("3.1")
    expect(context.remaining()).toBe("")
  })

  test("3.A", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("3.A")
    expect(context.remaining()).toBe("")
  })

  test("3-1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("3-1")
    expect(context.remaining()).toBe("")
  })

  test("3e", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("3")
    expect(context.remaining()).toBe("")
  })

  test("3ème", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("3")
    expect(context.remaining()).toBe("")
  })

  test("1er", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("1")
    expect(context.remaining()).toBe("")
  })

  test("A 3 A bis-3 A 7-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("A3 A bis-3 A 7-3")
    expect(context.remaining()).toBe("")
  })

  test("A 3e A bis-3e A 7-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("A3 A bis-3 A 7-3")
    expect(context.remaining()).toBe("")
  })

  test("annexe", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("annexe")
    expect(context.remaining()).toBe("")
  })

  test("D. 3 A bis-0", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("D3 A bis-0")
    expect(context.remaining()).toBe("")
  })

  test("L 321-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("L321-3")
    expect(context.remaining()).toBe("")
  })

  test("L 325-5-1", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("L325-5-1")
    expect(context.remaining()).toBe("")
  })

  test("L. 3 bis", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("L3 bis")
    expect(context.remaining()).toBe("")
  })

  test("L.O. 321-3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("LO321-3")
    expect(context.remaining()).toBe("")
  })

  test("Liminaire", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("liminaire")
    expect(context.remaining()).toBe("")
  })

  test("R. 3 bis-0", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomArticle(context)
    expect(result).toBe("R3 bis-0")
    expect(context.remaining()).toBe("")
  })
})

describe("nomSpecialArticle", () => {
  test("annexe", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomSpecialArticle(context) as TextAstArticle
    expect(result).toBe(task.name)
    expect(context.remaining()).toBe("")
  })

  test("Liminaire", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = nomSpecialArticle(context) as TextAstArticle
    expect(result).toBe("liminaire")
    expect(context.remaining()).toBe("")
  })
})

describe("typeArticle", () => {
  test("", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("")
    expect(context.remaining()).toBe("")
  })

  test("A.", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("A")
    expect(context.remaining()).toBe("")
  })

  test("D.", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("D")
    expect(context.remaining()).toBe("")
  })

  test("D**", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("D**")
    expect(context.remaining()).toBe("")
  })

  test("L.", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("L")
    expect(context.remaining()).toBe("")
  })

  test("L.O.", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("LO")
    expect(context.remaining()).toBe("")
  })

  test("LO", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("LO")
    expect(context.remaining()).toBe("")
  })

  test("R ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("R")
    expect(context.remaining()).toBe("")
  })

  test("R.", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("R")
    expect(context.remaining()).toBe("")
  })

  test("R. ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("R")
    expect(context.remaining()).toBe("")
  })

  test("**D", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("**D")
    expect(context.remaining()).toBe("")
  })

  test("**D**", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = typeArticle(context) as TextAstArticle
    expect(result).toBe("**D**")
    expect(context.remaining()).toBe("")
  })
})
