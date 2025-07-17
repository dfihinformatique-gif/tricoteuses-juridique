import { describe, expect, test } from "vitest"

import { type TextAstLaw, type TextAstPosition } from "./ast.js"
import { TextParserContext } from "./parsers.js"
import {
  identificationTexteEuropeen,
  identificationTexteFrancais,
  numeroTexteEuropeen,
  numeroTexteFrancais,
  texte,
  texteEuropeen,
  texteFrancais,
  texteInternational,
} from "./texts.js"

describe("Textes français", () => {
  describe("identificationTexteFrancais", () => {
    test("n° 2001-692", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteFrancais(context)).toStrictEqual({
        num: "2001-692",
      })
      expect(context.remaining()).toBe("")
    })

    test("no 2001-692 du 1er août 2001", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteFrancais(context)).toStrictEqual({
        lawDate: "2001-08-01",
        num: "2001-692",
      })
      expect(context.remaining()).toBe("")
    })

    test("du 30 février 1712", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteFrancais(context)).toStrictEqual({
        lawDate: "1712-02-30",
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
        lawDate: "1856-12-31",
        lawType: "arrêté",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })

    test("Constitution", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "JORFTEXT000000571356",
        lawType: "constitution",
        title: "Constitution",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })

    test("Constitution du 4 octobre 1958", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        cid: "JORFTEXT000000571356",
        lawDate: "1958-10-04",
        lawType: "constitution",
        title: "Constitution",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })

    test("loi organique n° 2001-692 du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteFrancais(context)).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "loi organique",
        num: "2001-692",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })
  })

  // matches(
  //   "nom_code",
  //   "code général des impôts, annexe 2",
  //   "Code général des impôts, annexe II",
  // );
  // matches(
  //   "nom_code",
  //   "code général des impôts annexe III",
  //   "Code général des impôts, annexe III",
  // );
  // matches("nom_code", "code général des  impôts", "Code général des impôts");
  // matches(
  //   "nom_code",
  //   "Livre  Des Procédures  Fiscales",
  //   "Livre des procédures fiscales",
  // );
  // matches("texte_francais", "code forestier de Mayotte", {
  //   type: "law",
  //   lawType: "code",
  //   title: "Code forestier de Mayotte",
  // })
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
        lawDate: "2001-12-01",
        num: "2001/73/CE",
      })
      expect(context.remaining()).toBe("")
    })

    test("du 30 février 1712", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(identificationTexteEuropeen(context)).toStrictEqual({
        lawDate: "1712-02-30",
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
        lawDate: "2003-09-05",
        lawType: "directive",
        legislation: "UE",
        num: "2001/73/CEE",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })

    test("règlement n° 2001/73 du 10 mars 2007", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteEuropeen(context)).toStrictEqual({
        lawDate: "2007-03-10",
        lawType: "règlement",
        legislation: "UE",
        num: "2001/73",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })

    test("règlement du 10 mars 2007", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteEuropeen(context)).toStrictEqual({
        lawDate: "2007-03-10",
        lawType: "règlement",
        legislation: "UE",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })
  })

  describe("texteInternational", () => {
    test("convention", ({ task }) => {
      const context = new TextParserContext(task.name)
      expect(texteInternational(context)).toStrictEqual({
        lawType: "convention",
        legislation: "international",
        type: "law",
      })
      expect(context.remaining()).toBe("")
    })
  })
})

describe("Règle générale", () => {
  describe("texte", () => {
    test("directive (UE) 2001/73/CEE du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "directive",
        legislation: "UE",
        num: "2001/73/CEE",
        position: { start: 0, stop: 46 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("dite même directive", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawType: "directive",
        legislation: "UE",
        localization: { relative: 0 },
        ofTheSaid: true,
        position: { start: 0, stop: 19 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("dite même directive (UE) 2001/73/CEE du 5 septembre 2003", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "directive",
        legislation: "UE",
        localization: { relative: 0 },
        num: "2001/73/CEE",
        ofTheSaid: true,
        position: { start: 0, stop: 56 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("dite même loi organique", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawType: "loi organique",
        localization: { relative: 0 },
        ofTheSaid: true,
        position: { start: 0, stop: 23 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("dite même loi organique", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawType: "loi organique",
        localization: { relative: 0 },
        ofTheSaid: true,
        position: { start: 0, stop: 23 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("dite même loi organique n° 2001-692 du 5 septembre 2003", ({
      task,
    }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "loi organique",
        localization: { relative: 0 },
        num: "2001-692",
        ofTheSaid: true,
        position: { start: 0, stop: 55 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("même loi organique n° 2001-692 du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "loi organique",
        localization: { relative: 0 },
        num: "2001-692",
        position: { start: 0, stop: 50 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })

    test("même directive (UE) 2001/73/CEE du 5 septembre 2003", ({ task }) => {
      const context = new TextParserContext(task.name)
      const result = texte(context) as TextAstLaw & TextAstPosition
      expect(result).toStrictEqual({
        lawDate: "2003-09-05",
        lawType: "directive",
        legislation: "UE",
        localization: { relative: 0 },
        num: "2001/73/CEE",
        position: { start: 0, stop: 51 },
        type: "law",
      })
      expect(context.remaining()).toBe("")
      expect(context.textSlice(result.position)).toBe(task.name)
    })
  })
})
