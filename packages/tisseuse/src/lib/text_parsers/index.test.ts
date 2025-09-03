import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import { getReferences } from "./index.js"
import { TextParserContext } from "./parsers.js"
import type {
  TextAstEnumeration,
  TextAstParentChild,
  TextAstPosition,
  TextAstText,
} from "./ast.js"

describe("getReferences", () => {
  test("à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151 de la loi n° 2020-1721 du 29 décembre 2020", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe(
      "loi n° 2020-1721 du 29 décembre 2020",
    )
    expect(context.text(reference.child.position)).toBe(
      "à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151",
    )
  })

  test("À l'avant-dernier alinéa de l'article 193", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("article 193")
    expect(context.text(reference.child.position)).toBe("avant-dernier alinéa")
  })

  test("à la première phrase du deuxième alinéa du a du I de l'article 219", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("article 219")
    expect(context.text(reference.child.position)).toBe(
      "première phrase du deuxième alinéa du a du I",
    )
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("I")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("première phrase du deuxième alinéa du a")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstParentChild)
          .parent.position,
      ),
    ).toBe("a")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstParentChild)
          .child.position,
      ),
    ).toBe("première phrase du deuxième alinéa")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstParentChild)
            .child as TextAstParentChild
        ).parent.position,
      ),
    ).toBe("deuxième alinéa")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstParentChild)
            .child as TextAstParentChild
        ).child.position,
      ),
    ).toBe("première phrase")
  })

  test("à la première phrase du second alinéa du 4 de l'article 199 sexdecies", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe(
      "article 199 sexdecies",
    )
    expect(context.text(reference.child.position)).toBe(
      "première phrase du second alinéa du 4",
    )
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("4")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("première phrase du second alinéa")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstParentChild)
          .parent.position,
      ),
    ).toBe("second alinéa")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstParentChild)
          .child.position,
      ),
    ).toBe("première phrase")
  })

  test("au I de l'article 7 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe("I de l'article 7")
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("article 7")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("I")
  })

  test("au I et au dernier alinéa du II bis de l'article L. 862-4 du code de la sécurité sociale", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe(
      "code de la sécurité sociale",
    )
    expect(context.text(reference.child.position)).toBe(
      "I et au dernier alinéa du II bis de l'article L. 862-4",
    )
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("article L. 862-4")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("I et au dernier alinéa du II bis")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .left.position,
      ),
    ).toBe("I")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .right.position,
      ),
    ).toBe("au dernier alinéa du II bis")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstEnumeration)
            .right as TextAstParentChild
        ).parent.position,
      ),
    ).toBe("II bis")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstEnumeration)
            .right as TextAstParentChild
        ).child.position,
      ),
    ).toBe("dernier alinéa")
  })

  test("au premier alinéa du I et au II du présent article", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("présent article")
    expect(context.text(reference.child.position)).toBe(
      "premier alinéa du I et au II",
    )
    expect(
      context.text((reference.child as TextAstEnumeration).left.position),
    ).toBe("premier alinéa du I")
    expect(
      context.text(
        ((reference.child as TextAstEnumeration).left as TextAstParentChild)
          .parent.position,
      ),
    ).toBe("I")
    expect(
      context.text(
        ((reference.child as TextAstEnumeration).left as TextAstParentChild)
          .child.position,
      ),
    ).toBe("premier alinéa")
    expect(
      context.text((reference.child as TextAstEnumeration).right.position),
    ).toBe("au II")
  })

  test("au second alinéa du 4", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("4")
    expect(context.text(reference.child.position)).toBe("second alinéa")
  })

  test("du 4° et aux 12°, 14° et 14° bis de l'article 81 du code général des impôts", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe(
      "code général des impôts",
    )
    expect(context.text(reference.child.position)).toBe(
      "4° et aux 12°, 14° et 14° bis de l'article 81",
    )
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("article 81")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("4° et aux 12°, 14° et 14° bis")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .left.position,
      ),
    ).toBe("4°")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .right.position,
      ),
    ).toBe("aux 12°, 14° et 14° bis")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstEnumeration)
            .right as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("12°, 14°")
    expect(
      context.text(
        (
          (
            (
              (reference.child as TextAstParentChild)
                .child as TextAstEnumeration
            ).right as TextAstEnumeration
          ).left as TextAstEnumeration
        ).left.position,
      ),
    ).toBe("12°")
    expect(
      context.text(
        (
          (
            (
              (reference.child as TextAstParentChild)
                .child as TextAstEnumeration
            ).right as TextAstEnumeration
          ).left as TextAstEnumeration
        ).right.position,
      ),
    ).toBe("14°")
    expect(
      context.text(
        (
          ((reference.child as TextAstParentChild).child as TextAstEnumeration)
            .right as TextAstEnumeration
        ).right.position,
      ),
    ).toBe("14° bis")
  })

  test("l'article 3 de la convention", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("convention")
    expect(context.text(reference.child.position)).toBe("article 3")
  })

  test("l'article 7 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe("article 7")
  })

  test("Début de l'article 2 du PLF", () => {
    const input = dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé par le montant : « 6 807 € » ;
    `
    const context = new TextParserContext(input)
    const references = getReferences(context)
    expect(references.length).toBe(2)
    expect(references).toStrictEqual([
      {
        action: {
          action: "MODIFICATION",
        },
        position: {
          start: 5,
          stop: 49,
        },
        reference: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 5,
            stop: 31,
          },
          title: "Code général des impôts",
          type: "texte",
        },
        type: "reference_et_action",
      },
      {
        action: {
          action: "MODIFICATION",
          actionInContent: true,
        },
        position: {
          start: 57,
          stop: 152,
        },
        reference: {
          child: {
            child: {
              index: 1,
              position: {
                start: 62,
                stop: 77,
              },
              type: "phrase",
            },
            parent: {
              index: 2,
              position: {
                start: 81,
                stop: 94,
              },
              type: "alinéa",
            },
            position: {
              start: 62,
              stop: 94,
            },
            type: "parent-enfant",
          },
          parent: {
            implicitText: {
              cid: "LEGITEXT000006069577",
              nature: "CODE",
              position: {
                start: 8,
                stop: 31,
              },
              title: "Code général des impôts",
              type: "texte",
            },
            num: "196 B",
            position: {
              start: 100,
              stop: 113,
            },
            type: "article",
          },
          position: {
            start: 57,
            stop: 113,
          },
          type: "parent-enfant",
        },
        type: "reference_et_action",
      },
    ])
    const reference0 = references[0] as TextAstText & TextAstPosition
    expect(context.text(reference0.position)).toBe(
      "Le code général des impôts est ainsi modifié",
    )
    const reference1 = references[1] as TextAstParentChild
    expect(context.text(reference1.position)).toBe(
      "A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé",
    )
  })

  test("les articles 111-1 et 111-2 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe(
      "articles 111-1 et 111-2",
    )
    expect(
      context.text((reference.child as TextAstEnumeration).left.position),
    ).toBe("111-1")
    expect(
      context.text((reference.child as TextAstEnumeration).right.position),
    ).toBe("111-2")
  })

  test("les articles 135-7 et 135-9 bis de la loi n°94-839 du 9 janvier 1994 ; à la première phrase du deuxième alinéa du a du I de l'article 219", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(2)
    expect(context.text(references[0].position)).toBe(
      "les articles 135-7 et 135-9 bis de la loi n°94-839 du 9 janvier 1994",
    )
    expect(context.text(references[1].position)).toBe(
      "à la première phrase du deuxième alinéa du a du I de l'article 219",
    )
  })

  test("les articles 7 et 9 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe("articles 7 et 9")
    expect(
      context.text((reference.child as TextAstEnumeration).left.position),
    ).toBe("7")
    expect(
      context.text((reference.child as TextAstEnumeration).right.position),
    ).toBe("9")
  })

  test("les I et II de l'article 111-1 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe(
      "I et II de l'article 111-1",
    )
    expect(
      context.text((reference.child as TextAstParentChild).parent.position),
    ).toBe("article 111-1")
    expect(
      context.text((reference.child as TextAstParentChild).child.position),
    ).toBe("I et II")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .left.position,
      ),
    ).toBe("I")
    expect(
      context.text(
        ((reference.child as TextAstParentChild).child as TextAstEnumeration)
          .right.position,
      ),
    ).toBe("II")
  })
})

describe("getReferences, test spécifiques", () => {
  test("Gestion des offsets dans iterReferences", () => {
    const input = dedent`
      xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      l'article 47 de la Constitution.
      l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012 et par la loi de finances de l'année ;
    `
    const context = new TextParserContext(input)
    const references = getReferences(context)
    expect(references.length).toBe(2)
    expect(context.text(references[0].position)).toBe(
      "l'article 47 de la Constitution",
    )
    expect(context.text(references[1].position)).toBe(
      "l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012",
    )
  })

  test("Références dans citation multi-lignes", () => {
    const input = dedent`
      « Art. 223 VO quindecies. - Sur option exercée par l'entité constitutive déclarante, et par dérogation au 3° de l'article 223 VO bis, les plus ou moins-values sur participations sont incluses dans le résultat qualifié d'une entité constitutive.
      « L'option mentionnée au premier alinéa est valable pour une période de cinq exercices, à compter de celui au titre duquel elle est exercée, et s'applique à toutes les entités constitutives situées dans l'État ou le territoire pour lequel elle a été formulée. Elle est formulée sur la déclaration mentionnée au II de l'article 223 WW souscrite au titre du premier exercice d'application. Elle est reconduite tacitement, sauf renonciation formulée par l'entité constitutive déclarante sur la déclaration mentionnée au même II souscrite au titre du dernier exercice d'application de l'option.
      « En cas de renonciation, une nouvelle option ne peut pas être exercée au titre des cinq exercices suivant le dernier exercice d'application de l'option. La renonciation ne peut porter sur des participations pour lesquelles une perte ou une moins-value a été prise en compte dans le résultat qualifié. » ;
           `
    const context = new TextParserContext(input)
    const references = getReferences(context)
    expect(references).toStrictEqual([
      {
        child: {
          index: 3,
          num: "3°",
          position: {
            start: 106,
            stop: 108,
          },
          type: "item",
        },
        parent: {
          num: "223 VO bis",
          position: {
            start: 114,
            stop: 132,
          },
          type: "article",
        },
        position: {
          start: 103,
          stop: 132,
        },
        type: "parent-enfant",
      },
      {
        index: 1,
        position: {
          start: 267,
          stop: 284,
        },
        type: "alinéa",
      },
      {
        child: {
          index: 2,
          num: "II",
          position: {
            start: 556,
            stop: 558,
          },
          type: "item",
        },
        parent: {
          num: "223 WW",
          position: {
            start: 564,
            stop: 578,
          },
          type: "article",
        },
        position: {
          start: 553,
          stop: 578,
        },
        type: "parent-enfant",
      },
    ])
    expect(context.text(references[0].position)).toBe(
      "au 3° de l'article 223 VO bis",
    )
    expect(context.text(references[1].position)).toBe("au premier alinéa")
    expect(context.text(references[2].position)).toBe(
      "au II de l'article 223 WW",
    )
  })

  test("Références dans citation simple", () => {
    const input = dedent`
      « III bis. – Par dérogation au I du présent article, le taux prévu à l'article 278 [...] »
    `
    const context = new TextParserContext(input)
    const references = getReferences(context)
    expect(references).toStrictEqual([
      {
        child: {
          index: 1,
          num: "I",
          position: {
            start: 31,
            stop: 32,
          },
          type: "item",
        },
        parent: {
          position: {
            start: 36,
            stop: 51,
          },
          relative: 0,
          type: "article",
        },
        position: {
          start: 28,
          stop: 51,
        },
        type: "parent-enfant",
      },
      {
        num: "278",
        position: {
          start: 67,
          stop: 82,
        },
        type: "article",
      },
    ])
    expect(context.text(references[0].position)).toBe("au I du présent article")
    expect(context.text(references[1].position)).toBe("à l'article 278")
  })

  test("Suppression d'implicitText lorsqu'un article a un texte parent", () => {
    const input = dedent`
      l'article 47 de la Constitution.
      l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012 et par la loi de finances de l'année ;
    `
    const context = new TextParserContext(input)
    const references = getReferences(context)
    expect(references.length).toBe(2)
    expect(context.text(references[0].position)).toBe(
      "l'article 47 de la Constitution",
    )
    expect(context.text(references[1].position)).toBe(
      "l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012",
    )
    expect(references[1]).toStrictEqual({
      child: {
        num: "46",
        position: {
          start: 35,
          stop: 45,
        },
        type: "article",
      },
      parent: {
        cid: "JORFTEXT000025044460",
        date: "2011-12-28",
        nature: "LOI",
        num: "2011-1977",
        position: {
          start: 52,
          stop: 110,
        },
        title: "LOI n° 2011-1977 du 28 décembre 2011 de finances pour 2012",
        type: "texte",
      },
      position: {
        start: 33,
        stop: 110,
      },
      type: "parent-enfant",
    })
  })
})
