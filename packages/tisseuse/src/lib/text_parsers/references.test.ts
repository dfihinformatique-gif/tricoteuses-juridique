import { describe, expect, test } from "vitest"

import type { TextAstParentChild, TextAstReference } from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  reference,
  referenceSingulier1Internal,
  uniteBasePreciseeSingulier,
  uniteBaseSingulier,
} from "./references.js"

describe("reference", () => {
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
        id: "98-293",
        lawDate: "1998-12-31",
        lawType: "loi",
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
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.parent.position)).toBe(
      "loi n° 98-293 du 31 décembre 1998",
    )
    expect(context.textSlice(result.child.position)).toBe("article 7 vicies A")
  })

  test("à la loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = reference(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "98-293",
      lawDate: "1998-12-31",
      lawType: "loi",
      position: {
        start: 0,
        stop: 38,
      },
      type: "law",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  // test("au code pénal", ({ task }) => {
  //   const context = new TextParserContext(task.name)
  //   const result = reference(context) as TextAstReference
  //   expect(result).toStrictEqual({})
  //   expect(context.input).toBe("")
  //   expect(context.textSlice(result.position)).toBe(task.name)
  // })
  // testSingleLink("l'article 7 du code pénal");
  // testSingleLink("à l'article 7 du code pénal");
  // testSingleLink("à l'article 7 bis du code pénal");
  // testSingleLink("à l'article 7 vicies A du code pénal");

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
    expect(context.input).toBe("")
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
        id: "98-293",
        lawDate: "1998-12-31",
        lawType: "loi",
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
    expect(context.input).toBe("")
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
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("loi n° 98-293 du 31 décembre 1998", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = uniteBaseSingulier(context) as TextAstReference
    expect(result).toStrictEqual({
      id: "98-293",
      lawDate: "1998-12-31",
      lawType: "loi",
      position: {
        start: 0,
        stop: 33,
      },
      type: "law",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})
