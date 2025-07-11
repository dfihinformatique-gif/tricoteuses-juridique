import { describe, expect, test } from "vitest"

import { TextParserContext } from "./core.js"
import {
  ditPluriel,
  ditSingulier,
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./prepositions.js"

describe("ditPluriel", () => {
  test("dits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditPluriel(context)).toBe(true)
    expect(context.input).toBe("")
  })

  test("dites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditPluriel(context)).toBe(true)
    expect(context.input).toBe("")
  })
})

describe("ditSingulier", () => {
  test("dit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditSingulier(context)).toBe(true)
    expect(context.input).toBe("")
  })

  test("dite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditSingulier(context)).toBe(true)
    expect(context.input).toBe("")
  })
})

describe("introPluriel", () => {
  test("aux ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe(task.name)
    expect(context.input).toBe("")
  })

  test("auxdits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe("aux")
    expect(context.input).toBe("dits ")
  })

  test("auxdites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe("aux")
    expect(context.input).toBe("dites ")
  })
})

describe("introSingulier", () => {
  test("au ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.input).toBe("")
  })

  test("audit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe("au")
    expect(context.input).toBe("dit ")
  })

  test("la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.input).toBe("")
  })

  test("à la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.input).toBe("")
  })

  test("à ladite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe("à la")
    expect(context.input).toBe("dite ")
  })
})

describe("liaisonPluriel", () => {
  test(" de ces ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.input).toBe("ces ")
  })

  test(" de cettes ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.input).toBe("cettes ")
  })

  test(" des ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.input).toBe("")
  })

  test(" desdits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.input).toBe("dits ")
  })

  test(" desdites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.input).toBe("dites ")
  })
})

describe("liaisonSingulier", () => {
  test(" de ce ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("ce ")
  })

  test(" de cette ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("cette ")
  })

  test(" de l'", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("")
  })

  test(" de la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("")
  })

  test(" de ladite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("dite ")
  })

  test(" dudit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.input).toBe("dit ")
  })
})
