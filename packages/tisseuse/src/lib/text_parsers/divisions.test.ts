import { describe, expect, test } from "vitest"

import { type TextAstDivision, type TextAstEnumeration } from "./ast.js"
import {
  definitionDivision,
  designationDivision,
  division,
  division1Internal,
  division2Internal,
  divisions,
  natureDivisionSingulier,
  numeroDivision,
} from "./divisions.js"
import { TextParserContext } from "./parsers.js"

describe("definitionDivision", () => {
  test("Chapitre Ier", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 1,
      num: "Ier",
      position: {
        start: 0,
        stop: 12,
      },
      type: "chapitre",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Chapitre Ier nonies", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 1.009,
      num: "Ier nonies",
      position: {
        start: 0,
        stop: 19,
      },
      type: "chapitre",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Chapitre II", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 2,
      num: "II",
      position: {
        start: 0,
        stop: 11,
      },
      type: "chapitre",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Section 0I bis", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 0.002,
      num: "0I bis",
      position: {
        start: 0,
        stop: 14,
      },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Section unique", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 1,
      num: "unique",
      position: {
        start: 0,
        stop: 14,
      },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("Sous-section 2", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 2,
      num: "2",
      position: {
        start: 0,
        stop: 14,
      },
      type: "sous-section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("TITRE II", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = definitionDivision(context) as TextAstDivision
    expect(result).toStrictEqual({
      definition: true,
      index: 2,
      num: "II",
      position: {
        start: 0,
        stop: 8,
      },
      type: "titre",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})

describe("designationDivision", () => {
  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationDivision(context)
    expect(result).toStrictEqual({
      index: 0,
      num: "0I",
      position: { start: 0, stop: 2 },
      type: "incomplete-header",
    })
    expect(context.remaining()).toBe("")
  })

  test("III", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationDivision(context)
    expect(result).toStrictEqual({
      index: 3,
      num: "III",
      position: { start: 0, stop: 3 },
      type: "incomplete-header",
    })
    expect(context.remaining()).toBe("")
  })

  test("III bis", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationDivision(context)
    expect(result).toStrictEqual({
      index: 3.002,
      num: "III bis",
      position: { start: 0, stop: 7 },
      type: "incomplete-header",
    })
    expect(context.remaining()).toBe("")
  })
})

describe("division", () => {
  test("dite même section", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      ofTheSaid: true,
      position: { start: 0, stop: 17 },
      relative: 0,
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("dite même section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 3,
      num: "3",
      ofTheSaid: true,
      position: { start: 0, stop: 19 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("dite section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 3,
      num: "3",
      ofTheSaid: true,
      position: { start: 0, stop: 14 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("même section", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      position: { start: 0, stop: 12 },
      relative: 0,
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("même section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 3,
      num: "3",
      position: { start: 0, stop: 14 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("première section", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 1,
      num: "première",
      position: {
        start: 0,
        stop: 16,
      },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("section 0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 0,
      num: "0I",
      position: { start: 0, stop: 10 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 3,
      num: "3",
      position: { start: 0, stop: 9 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})

describe("division1Internal", () => {
  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("section 0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division1Internal(context) as TextAstDivision
    expect(result).toStrictEqual({
      index: 0,
      num: "0I",
      position: { start: 0, stop: 10 },
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })
})

describe("division2Internal", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division2Internal(context)
    expect(result).toStrictEqual({
      index: 0,
      num: "0I",
      position: { start: 0, stop: 2 },
      type: "incomplete-header",
    })
    expect(context.remaining()).toBe("")
  })
})

describe("divisions", () => {
  test("dites mêmes sections", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 20,
      },
      relative: 0,
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("dites mêmes sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        index: 3,
        num: "3",
        ofTheSaid: true,
        position: {
          start: 21,
          stop: 22,
        },
        type: "section",
      },
      position: {
        start: 0,
        stop: 27,
      },
      right: {
        index: 4,
        num: "4",
        ofTheSaid: true,
        position: {
          start: 26,
          stop: 27,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe("3")
    expect(context.text(result.right.position)).toBe("4")
  })

  test("dites sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        index: 3,
        num: "3",
        ofTheSaid: true,
        position: {
          start: 15,
          stop: 16,
        },
        type: "section",
      },
      position: {
        start: 0,
        stop: 21,
      },
      right: {
        index: 4,
        num: "4",
        ofTheSaid: true,
        position: {
          start: 20,
          stop: 21,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe("3")
    expect(context.text(result.right.position)).toBe("4")
  })

  test("mêmes sections", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      position: {
        start: 0,
        stop: 14,
      },
      relative: 0,
      type: "section",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
  })

  test("mêmes sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        index: 3,
        num: "3",
        position: {
          start: 15,
          stop: 16,
        },
        type: "section",
      },
      position: {
        start: 0,
        stop: 21,
      },
      right: {
        index: 4,
        num: "4",
        position: {
          start: 20,
          stop: 21,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe("3")
    expect(context.text(result.right.position)).toBe("4")
  })

  test("sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        index: 3,
        num: "3",
        position: {
          start: 9,
          stop: 10,
        },
        type: "section",
      },
      position: {
        start: 0,
        stop: 15,
      },
      right: {
        index: 4,
        num: "4",
        position: {
          start: 14,
          stop: 15,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.remaining()).toBe("")
    expect(context.text(result.position)).toBe(task.name)
    expect(context.text(result.left.position)).toBe("3")
    expect(context.text(result.right.position)).toBe("4")
  })
})

describe("natureDivisionSingulier", () => {
  test("section", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(natureDivisionSingulier(context)).toBe("section")
    expect(context.remaining()).toBe("")
  })
})

describe("numeroDivision", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(numeroDivision(context)).toStrictEqual({
      index: 0,
      num: "0I",
    })
    expect(context.remaining()).toBe("")
  })
})
