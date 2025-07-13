import { describe, expect, test } from "vitest"

import { type TextAstDivision, type TextAstEnumeration } from "./ast.js"
import {
  designationDivision,
  division,
  division1Internal,
  division2Internal,
  divisions,
  natureDivisionSingulier,
  numeroDivision,
} from "./divisions.js"
import { TextParserContext } from "./parsers.js"

describe("designationDivision", () => {
  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = designationDivision(context)
    expect(result).toStrictEqual({
      id: "0I",
      position: { start: 0, stop: 2 },
      type: "incomplete-header",
    })
    expect(context.input).toBe("")
  })
})

describe("division", () => {
  test("dite même section", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: { start: 0, stop: 17 },
      type: "section",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dite même section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      id: "3",
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: { start: 0, stop: 19 },
      type: "section",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dite section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      id: "3",
      ofTheSaid: true,
      position: { start: 0, stop: 14 },
      type: "section",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("même section", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      type: "section",
      localization: { relative: 0 },
      position: { start: 0, stop: 12 },
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("même section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      type: "section",
      id: "3",
      localization: { relative: 0 },
      position: { start: 0, stop: 14 },
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("section 0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      type: "section",
      id: "0I",
      position: { start: 0, stop: 10 },
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("section 3", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division(context) as TextAstDivision
    expect(result).toStrictEqual({
      type: "section",
      id: "3",
      position: { start: 0, stop: 9 },
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("division1Internal", () => {
  // Exemple : section 0I du chapitre III du titre Ier de la première partie du livre Ier du code général des impôts
  // https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006069577/LEGISCTA000025049019
  test("section 0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division1Internal(context) as TextAstDivision
    expect(result).toStrictEqual({
      type: "section",
      id: "0I",
      position: { start: 0, stop: 10 },
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })
})

describe("division2Internal", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = division2Internal(context)
    expect(result).toStrictEqual({
      id: "0I",
      position: { start: 0, stop: 2 },
      type: "incomplete-header",
    })
    expect(context.input).toBe("")
  })
})

describe("divisions", () => {
  test("dites mêmes sections", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      ofTheSaid: true,
      position: {
        start: 0,
        stop: 20,
      },
      type: "section",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("dites mêmes sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        id: "3",
        localization: {
          relative: 0,
        },
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
        id: "4",
        localization: {
          relative: 0,
        },
        ofTheSaid: true,
        position: {
          start: 26,
          stop: 27,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("3")
    expect(context.textSlice(result.right.position)).toBe("4")
  })

  test("dites sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        id: "3",
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
        id: "4",
        ofTheSaid: true,
        position: {
          start: 20,
          stop: 21,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("3")
    expect(context.textSlice(result.right.position)).toBe("4")
  })

  test("mêmes sections", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      localization: {
        relative: 0,
      },
      position: {
        start: 0,
        stop: 14,
      },
      type: "section",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
  })

  test("mêmes sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        id: "3",
        localization: { relative: 0 },
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
        id: "4",
        localization: { relative: 0 },
        position: {
          start: 20,
          stop: 21,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("3")
    expect(context.textSlice(result.right.position)).toBe("4")
  })

  test("sections 3 et 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = divisions(context) as TextAstEnumeration
    expect(result).toStrictEqual({
      coordinator: "et",
      left: {
        id: "3",
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
        id: "4",
        position: {
          start: 14,
          stop: 15,
        },
        type: "section",
      },
      type: "enumeration",
    })
    expect(context.input).toBe("")
    expect(context.textSlice(result.position)).toBe(task.name)
    expect(context.textSlice(result.left.position)).toBe("3")
    expect(context.textSlice(result.right.position)).toBe("4")
  })
})

describe("natureDivisionSingulier", () => {
  test("section", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(natureDivisionSingulier(context)).toBe("section")
    expect(context.input).toBe("")
  })
})

describe("numeroDivision", () => {
  test("0I", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(numeroDivision(context)).toBe("0I")
    expect(context.input).toBe("")
  })
})
