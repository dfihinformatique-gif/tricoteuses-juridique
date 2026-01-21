import { describe, expect, test } from "vitest"

import { optional, TextParserContext } from "./parsers.js"
import {
  adjectifTemporelSingulier,
  ditPluriel,
  ditSingulier,
  introPluriel,
  introSingulier,
  liaisonPluriel,
  liaisonSingulier,
} from "./prepositions.js"

describe("adjectifTemporelSingulier", () => {
  test("ancien ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = adjectifTemporelSingulier(context)
    expect(result).toBe("old")
    expect(context.remaining()).toBe("")
  })

  test("ancienne ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = adjectifTemporelSingulier(context)
    expect(result).toBe("old")
    expect(context.remaining()).toBe("")
  })

  test("nouveau ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = adjectifTemporelSingulier(context)
    expect(result).toBe("new")
    expect(context.remaining()).toBe("")
  })

  test("nouvel ", ({ task }) => {
    const context = new TextParserContext(task.name)
    const result = adjectifTemporelSingulier(context)
    expect(result).toBe("new")
    expect(context.remaining()).toBe("")
  })
})

describe("ditPluriel", () => {
  test("dits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditPluriel(context)).toBe(true)
    expect(context.remaining()).toBe("")
  })

  test("dites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditPluriel(context)).toBe(true)
    expect(context.remaining()).toBe("")
  })
})

describe("ditSingulier", () => {
  test("dit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditSingulier(context)).toBe(true)
    expect(context.remaining()).toBe("")
  })

  test("dite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(ditSingulier(context)).toBe(true)
    expect(context.remaining()).toBe("")
  })
})

describe("optional(ditSingulier, { default: false })", () => {
  test("", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(optional(ditSingulier, { default: false })(context)).toBe(false)
    expect(context.remaining()).toBe("")
  })
  test("dite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(optional(ditSingulier, { default: false })(context)).toBe(true)
    expect(context.remaining()).toBe("")
  })
  test("même ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(optional(ditSingulier, { default: false })(context)).toBe(false)
    expect(context.remaining()).toBe(task.name)
  })
})

describe("introPluriel", () => {
  test("aux ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe(task.name)
    expect(context.remaining()).toBe("")
  })

  test("auxdits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe("aux")
    expect(context.remaining()).toBe("dits ")
  })

  test("auxdites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introPluriel(context)).toBe("aux")
    expect(context.remaining()).toBe("dites ")
  })
})

describe("introSingulier", () => {
  test("au ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.remaining()).toBe("")
  })

  test("audit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe("au")
    expect(context.remaining()).toBe("dit ")
  })

  test("la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.remaining()).toBe("")
  })

  test("à la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe(task.name)
    expect(context.remaining()).toBe("")
  })

  test("à ladite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(introSingulier(context)).toBe("à la")
    expect(context.remaining()).toBe("dite ")
  })
})

describe("liaisonPluriel", () => {
  test(" de ces ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.remaining()).toBe("ces ")
  })

  test(" de cettes ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.remaining()).toBe("cettes ")
  })

  test(" des ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.remaining()).toBe("")
  })

  test(" desdits ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.remaining()).toBe("dits ")
  })

  test(" desdites ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonPluriel(context)).toBe("des")
    expect(context.remaining()).toBe("dites ")
  })
})

describe("liaisonSingulier", () => {
  test(" de ce ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("ce ")
  })

  test(" de cette ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("cette ")
  })

  test(" de l'", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("")
  })

  test(" de la ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("")
  })

  test(" de ladite ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("dite ")
  })

  test(" dudit ", ({ task }) => {
    const context = new TextParserContext(task.name)
    expect(liaisonSingulier(context)).toBe("de")
    expect(context.remaining()).toBe("dit ")
  })
})
