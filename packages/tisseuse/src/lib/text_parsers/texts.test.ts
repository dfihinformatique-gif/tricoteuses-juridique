import { describe, expect, test } from "vitest"

import { type TextAstPosition, type TextAstText } from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  identificationTexteEuropeen,
  numeroEtOuDateTexteFrancais,
  numeroTexteEuropeen,
  numeroTexteFrancais,
  texte,
  texteEuropeen,
  texteFrancais,
  texteInternational,
} from "./texts.js"

describe("Textes français", () => {
  describe("numeroEtOuDateTexteFrancais", () => {
    test("n° 2001-692", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroEtOuDateTexteFrancais(context)).toStrictEqual({
        num: "2001-692",
      })
      expect(context.remaining()).toBe("")
    })

    test("no 2001-692 du 1er août 2001", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroEtOuDateTexteFrancais(context)).toStrictEqual({
        date: "2001-08-01",
        num: "2001-692",
      })
      expect(context.remaining()).toBe("")
    })

    test("du 30 février 1712", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroEtOuDateTexteFrancais(context)).toStrictEqual({
        date: "1712-02-30",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("numeroTexteFrancais", () => {
    test("n° 78-17", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroTexteFrancais(context)).toBe("78-17")
      expect(context.remaining()).toBe("")
    })
  })

  describe("texteFrancais", () => {
    test("arrêté du 31 décembre 1856", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        date: "1856-12-31",
        nature: "ARRETE",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("code de l'éducation", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006071191",
        nature: "CODE",
        title: "Code de l'éducation",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("code forestier de Mayotte", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006071556",
        nature: "CODE",
        title: "Code forestier de Mayotte",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("code général des impôts", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        title: "Code général des impôts",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("code général des impôts est", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006069577",
        nature: "CODE",
        title: "Code général des impôts",
        type: "texte",
      })
      expect(context.remaining()).toBe(" est")
    })

    test("code général des impôts, annexe 2", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006069569",
        nature: "CODE",
        title: "Code général des impôts, annexe II",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("code général des impôts, annexe III", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "LEGITEXT000006069574",
        nature: "CODE",
        title: "Code général des impôts, annexe III",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("Constitution", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "JORFTEXT000000571356",
        nature: "CONSTITUTION",
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("constitution", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toBe(undefined)
      expect(context.remaining()).toBe(task.name)
    })

    test("Constitution du 4 octobre 1958", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "JORFTEXT000000571356",
        date: "1958-10-04",
        nature: "CONSTITUTION",
        title: "Constitution du 4 octobre 1958",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("LOI n° 2023-1195 du 18 décembre 2023 de programmation des finances publiques pour les années 2023 à 2027", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        cid: "JORFTEXT000048581885",
        date: "2023-12-18",
        nature: "LOI",
        num: "2023-1195",
        position: {
          start: 0,
          stop: 104,
        },
        title:
          "LOI n° 2023-1195 du 18 décembre 2023 de programmation des finances publiques pour les années 2023 à 2027",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("loi organique n° 2001-692 du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "JORFTEXT000000394028",
        date: "2003-09-05",
        nature: "LOI_ORGANIQUE",
        num: "2001-692",
        title:
          "Loi organique n° 2001-692 du 1 août 2001 relative aux lois de finances",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })
  })
})

describe("Textes européens et internationaux", () => {
  describe("identificationTexteEuropeen", () => {
    test("2001/73/CEE", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteEuropeen(context)).toStrictEqual({
        num: "2001/73/CEE",
      })
      expect(context.remaining()).toBe("")
    })

    test("no 2001/73/CE du 1er décembre 2001", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteEuropeen(context)).toStrictEqual({
        date: "2001-12-01",
        num: "2001/73/CE",
      })
      expect(context.remaining()).toBe("")
    })

    test("du 30 février 1712", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteEuropeen(context)).toStrictEqual({
        date: "1712-02-30",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("numeroTexteEuropeen", () => {
    test("n° 2001/73", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroTexteEuropeen(context)).toBe("2001/73")
      expect(context.remaining()).toBe("")
    })

    test("2001/73/ CE", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroTexteEuropeen(context)).toBe("2001/73/CE")
      expect(context.remaining()).toBe("")
    })

    test("2001/73 /CEE", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(numeroTexteEuropeen(context)).toBe("2001/73/CEE")
      expect(context.remaining()).toBe("")
    })
  })

  describe("texteEuropeen", () => {
    test("directive (UE) 2001/73/CEE du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteEuropeen(context)).toStrictEqual({
        date: "2003-09-05",
        nature: "DIRECTIVE_EURO",
        legislation: "UE",
        num: "2001/73/CEE",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("règlement n° 2001/73 du 10 mars 2007", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteEuropeen(context)).toStrictEqual({
        date: "2007-03-10",
        nature: "REGLEMENTEUROPEEN",
        legislation: "UE",
        num: "2001/73",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })

    test("règlement du 10 mars 2007", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteEuropeen(context)).toStrictEqual({
        date: "2007-03-10",
        nature: "REGLEMENTEUROPEEN",
        legislation: "UE",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("texteInternational", () => {
    test("convention", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteInternational(context)).toStrictEqual({
        nature: "CONVENTION",
        legislation: "international",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
    })
  })
})

describe("Règle générale", () => {
  describe("texte", () => {
    test("directive (UE) 2001/73/CEE du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        date: "2003-09-05",
        nature: "DIRECTIVE_EURO",
        legislation: "UE",
        num: "2001/73/CEE",
        position: { start: 0, stop: 46 },
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("dite même directive", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        nature: "DIRECTIVE_EURO",
        legislation: "UE",
        ofTheSaid: true,
        position: { start: 0, stop: 19 },
        relative: 0,
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("dite même directive (UE) 2001/73/CEE du 5 septembre 2003", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        date: "2003-09-05",
        nature: "DIRECTIVE_EURO",
        legislation: "UE",
        num: "2001/73/CEE",
        ofTheSaid: true,
        position: { start: 0, stop: 56 },
        relative: 0,
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("dite même loi organique", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        nature: "LOI_ORGANIQUE",
        ofTheSaid: true,
        position: { start: 0, stop: 23 },
        relative: 0,
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("dite même loi organique", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        nature: "LOI_ORGANIQUE",
        ofTheSaid: true,
        position: { start: 0, stop: 23 },
        relative: 0,
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("dite même loi organique n° 2001-692 du 5 septembre 2003", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        cid: "JORFTEXT000000394028",
        date: "2003-09-05",
        nature: "LOI_ORGANIQUE",
        num: "2001-692",
        ofTheSaid: true,
        position: { start: 0, stop: 55 },
        relative: 0,
        title:
          "Loi organique n° 2001-692 du 1 août 2001 relative aux lois de finances",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("même loi organique n° 2001-692 du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        cid: "JORFTEXT000000394028",
        date: "2003-09-05",
        nature: "LOI_ORGANIQUE",
        num: "2001-692",
        position: { start: 0, stop: 50 },
        relative: 0,
        title:
          "Loi organique n° 2001-692 du 1 août 2001 relative aux lois de finances",
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })

    test("même directive (UE) 2001/73/CEE du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstText & TextAstPosition
      expect(result).toStrictEqual({
        date: "2003-09-05",
        nature: "DIRECTIVE_EURO",
        legislation: "UE",
        num: "2001/73/CEE",
        position: { start: 0, stop: 51 },
        relative: 0,
        type: "texte",
      })
      expect(context.remaining()).toBe("")
      expect(context.text(result.position)).toBe(task.name)
    })
  })
})
