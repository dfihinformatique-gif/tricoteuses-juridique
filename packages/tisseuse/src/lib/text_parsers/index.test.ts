import dedent from "dedent-js"
import { describe, expect, test } from "vitest"

import type {
  TextAstEnumeration,
  TextAstParentChild,
  TextAstPosition,
  TextAstText,
} from "./ast.js"
import {
  getParsedReferences,
  getParsedReferencesWithOriginalTransformations,
} from "./index.js"
import { TextParserContext } from "./parsers.js"
import { simplifyHtml } from "./simplifiers.js"
import { reverseTransformedInnerFragment } from "./transformers.js"

describe("getParsedReferences", () => {
  test("à l'article 200 undecies, aux articles 244 quater B à 244 quater W et aux articles 27 et 151 de la loi n° 2020-1721 du 29 décembre 2020", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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

  test("il est inséré un article 223 VO quindecies ainsi rédigé", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getParsedReferences(context)
    expect(references).toStrictEqual([])
  })

  test("l'article 3 de la convention", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getParsedReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("convention")
    expect(context.text(reference.child.position)).toBe("article 3")
  })

  test("l'article 7 du code pénal", ({ task }) => {
    const context = new TextParserContext(task.name)
    const references = getParsedReferences(context)
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(context.text(reference.position)).toBe(task.name)
    expect(context.text(reference.parent.position)).toBe("code pénal")
    expect(context.text(reference.child.position)).toBe("article 7")
  })

  test("Le début de l'article 2 du PLF", () => {
    const input = dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - A la première phrase du second alinéa de l'article 196 B, le montant : « 6 674 € » est remplacé par le montant : « 6 807 € » ;
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
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
          titleRest: "général des impôts",
          type: "texte",
        },
        type: "reference_et_action",
      },
      {
        action: {
          action: "MODIFICATION",
          actionInContent: true,
          originalCitations: [
            {
              content: [
                {
                  position: {
                    start: 130,
                    stop: 137,
                  },
                },
              ],
              position: {
                start: 128,
                stop: 139,
              },
              type: "citation",
            },
          ],
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
              titleRest: "général des impôts",
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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

describe("getParsedReferences, test spécifiques", () => {
  test("Définition d'un nouvel article", () => {
    const input = dedent`
      22° Après l'article 223 WA quinquies, il est inséré un article 223 WA quinquies A ainsi rédigé :
      « Art. 223 WA quinquies A. - Les charges de personnel et les actifs corporels d'une entité soumise à un régime de dividendes déductibles mentionnée au I de l'article 223 WR bis ou détenue dans les conditions du V du même article, sont réduits proportionnellement au bénéfice exclu du calcul du bénéfice qualifié de l'entité conformément aux II et III de l'article 223 WR bis. » ;
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
    expect(references).toStrictEqual([
      {
        action: {
          action: "CREATION",
        },
        position: {
          start: 10,
          stop: 51,
        },
        reference: {
          num: "223 WA quinquies",
          position: {
            start: 10,
            stop: 36,
          },
          type: "article",
        },
        type: "reference_et_action",
      },
      {
        definition: true,
        num: "223 WA quinquies A",
        position: {
          start: 99,
          stop: 122,
        },
        type: "article",
      },
      {
        child: {
          index: 1,
          num: "I",
          position: {
            start: 248,
            stop: 249,
          },
          type: "item",
        },
        parent: {
          num: "223 WR bis",
          position: {
            start: 255,
            stop: 273,
          },
          type: "article",
        },
        position: {
          start: 245,
          stop: 273,
        },
        type: "parent-enfant",
      },
      {
        child: {
          index: 5,
          num: "V",
          position: {
            start: 308,
            stop: 309,
          },
          type: "item",
        },
        parent: {
          position: {
            start: 313,
            stop: 325,
          },
          relative: 0,
          type: "article",
        },
        position: {
          start: 305,
          stop: 325,
        },
        type: "parent-enfant",
      },
      {
        child: {
          coordinator: "et",
          left: {
            index: 2,
            num: "II",
            position: {
              start: 438,
              stop: 440,
            },
            type: "item",
          },
          position: {
            start: 438,
            stop: 447,
          },
          right: {
            index: 3,
            num: "III",
            position: {
              start: 444,
              stop: 447,
            },
            type: "item",
          },
          type: "enumeration",
        },
        parent: {
          num: "223 WR bis",
          position: {
            start: 453,
            stop: 471,
          },
          type: "article",
        },
        position: {
          start: 434,
          stop: 471,
        },
        type: "parent-enfant",
      },
    ])
    expect(context.text(references[0].position)).toBe(
      "l'article 223 WA quinquies, il est inséré",
    )
    expect(context.text(references[1].position)).toBe("Art. 223 WA quinquies A")
    expect(context.text(references[2].position)).toBe(
      "au I de l'article 223 WR bis",
    )
    expect(context.text(references[3].position)).toBe("du V du même article")
    expect(context.text(references[4].position)).toBe(
      "aux II et III de l'article 223 WR bis",
    )
  })

  test("Définition de nouvelles divisions et de nouveaux articles", () => {
    const input = dedent`
      2° Le livre III est complété par un titre II ainsi rédigé :
      « TITRE II
      « TAXES NE RELEVANT PAS DU RÉGIME GÉNÉRAL D'ACCISE
      « Chapitre Ier
      « Dispositions générales
      « Section unique
      « Eléments taxables et territoires
      « Art. L. 321-1. - Les articles L. 311-1, L. 312-3, L. 313-2 et L. 314-3 à L. 314-6 sont applicables aux taxes régies par le présent titre.
      « Art. L. 321-2. - Pour l'application du présent titre, les cinq territoires mentionnés à l'article L. 112-4 sont regardés comme un territoire de taxation unique. »
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
    expect(references).toStrictEqual([
      {
        action: {
          action: "CREATION",
        },
        position: {
          start: 3,
          stop: 28,
        },
        reference: {
          index: 3,
          num: "III",
          position: {
            start: 3,
            stop: 15,
          },
          type: "livre",
        },
        type: "reference_et_action",
      },
      {
        definition: true,
        index: 2,
        num: "II",
        position: {
          start: 62,
          stop: 70,
        },
        type: "titre",
      },
      {
        definition: true,
        index: 1,
        num: "Ier",
        position: {
          start: 124,
          stop: 136,
        },
        type: "chapitre",
      },
      {
        definition: true,
        index: 1,
        num: "unique",
        position: {
          start: 164,
          stop: 178,
        },
        type: "section",
      },
      {
        definition: true,
        num: "L321-1",
        position: {
          start: 216,
          stop: 229,
        },
        type: "article",
      },
      {
        coordinator: "et",
        left: {
          coordinator: ",",
          left: {
            coordinator: ",",
            left: {
              num: "L311-1",
              position: {
                start: 246,
                stop: 254,
              },
              type: "article",
            },
            position: {
              start: 246,
              stop: 264,
            },
            right: {
              num: "L312-3",
              position: {
                start: 256,
                stop: 264,
              },
              type: "article",
            },
            type: "enumeration",
          },
          position: {
            start: 246,
            stop: 274,
          },
          right: {
            num: "L313-2",
            position: {
              start: 266,
              stop: 274,
            },
            type: "article",
          },
          type: "enumeration",
        },
        position: {
          start: 233,
          stop: 297,
        },
        right: {
          first: {
            num: "L314-3",
            position: {
              start: 278,
              stop: 286,
            },
            type: "article",
          },
          last: {
            num: "L314-6",
            position: {
              start: 289,
              stop: 297,
            },
            type: "article",
          },
          position: {
            start: 278,
            stop: 297,
          },
          type: "bounded-interval",
        },
        type: "enumeration",
      },
      {
        position: {
          start: 336,
          stop: 352,
        },
        relative: 0,
        type: "titre",
      },
      {
        definition: true,
        num: "L321-2",
        position: {
          start: 356,
          stop: 369,
        },
        type: "article",
      },
      {
        position: {
          start: 392,
          stop: 408,
        },
        relative: 0,
        type: "titre",
      },
      {
        num: "L112-4",
        position: {
          start: 442,
          stop: 462,
        },
        type: "article",
      },
    ])
    expect(context.text(references[0].position)).toBe(
      "Le livre III est complété",
    )
    expect(context.text(references[1].position)).toBe("TITRE II")
    expect(context.text(references[2].position)).toBe("Chapitre Ier")
    expect(context.text(references[3].position)).toBe("Section unique")
    expect(context.text(references[4].position)).toBe("Art. L. 321-1")
    expect(context.text(references[5].position)).toBe(
      "Les articles L. 311-1, L. 312-3, L. 313-2 et L. 314-3 à L. 314-6",
    )
    expect(context.text(references[6].position)).toBe("le présent titre")
    expect(context.text(references[7].position)).toBe("Art. L. 321-2")
    expect(context.text(references[8].position)).toBe("du présent titre")
    expect(context.text(references[9].position)).toBe("à l'article L. 112-4")
  })

  test("Gestion des offsets dans parseReferences", () => {
    const input = dedent`
      xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      l'article 47 de la Constitution.
      l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012 et par la loi de finances de l'année ;
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
    expect(references.length).toBe(2)
    expect(context.text(references[0].position)).toBe(
      "l'article 47 de la Constitution",
    )
    expect(context.text(references[1].position)).toBe(
      "l'article 46 de la loi n° 2011-1977 du 28 décembre 2011 de finances pour 2012",
    )
  })

  test("Références avant et dans citation", () => {
    const input = dedent`
      I. - Le code général des impôts est ainsi modifié :
      A. - Au chapitre II bis du titre premier de la première partie du livre premier :
      1° A l'article 223 VK :
      4° Après l'article 223 VO quaterdecies, il est inséré un article 223 VO quindecies ainsi rédigé :
      « Art. 223 VO quindecies. - Sur option exercée par l'entité constitutive déclarante, et par dérogation au 3° de l'article 223 VO bis, les plus ou moins-values sur participations sont incluses dans le résultat qualifié d'une entité constitutive.
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
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
          titleRest: "général des impôts",
          type: "texte",
        },
        type: "reference_et_action",
      },
      {
        child: {
          child: {
            child: {
              index: 2.002,
              num: "II bis",
              position: {
                start: 60,
                stop: 75,
              },
              type: "chapitre",
            },
            parent: {
              index: 1,
              num: "premier",
              position: {
                start: 79,
                stop: 92,
              },
              type: "titre",
            },
            position: {
              start: 60,
              stop: 92,
            },
            type: "parent-enfant",
          },
          parent: {
            index: 1,
            num: "première",
            position: {
              start: 99,
              stop: 114,
            },
            type: "partie",
          },
          position: {
            start: 60,
            stop: 114,
          },
          type: "parent-enfant",
        },
        parent: {
          index: 1,
          num: "premier",
          position: {
            start: 118,
            stop: 131,
          },
          type: "livre",
        },
        position: {
          start: 57,
          stop: 131,
        },
        type: "parent-enfant",
      },
      {
        implicitText: {
          cid: "LEGITEXT000006069577",
          nature: "CODE",
          position: {
            start: 8,
            stop: 31,
          },
          title: "Code général des impôts",
          titleRest: "général des impôts",
          type: "texte",
        },
        num: "223 VK",
        position: {
          start: 137,
          stop: 155,
        },
        type: "article",
      },
      {
        action: {
          action: "CREATION",
        },
        position: {
          start: 167,
          stop: 211,
        },
        reference: {
          implicitText: {
            cid: "LEGITEXT000006069577",
            nature: "CODE",
            position: {
              start: 8,
              stop: 31,
            },
            title: "Code général des impôts",
            titleRest: "général des impôts",
            type: "texte",
          },
          num: "223 VO quaterdecies",
          position: {
            start: 167,
            stop: 196,
          },
          type: "article",
        },
        type: "reference_et_action",
      },
      {
        child: {
          index: 3,
          num: "3°",
          position: {
            start: 362,
            stop: 364,
          },
          type: "item",
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
            titleRest: "général des impôts",
            type: "texte",
          },
          num: "223 VO bis",
          position: {
            start: 370,
            stop: 388,
          },
          type: "article",
        },
        position: {
          start: 359,
          stop: 388,
        },
        type: "parent-enfant",
      },
    ])
    expect(context.text(references[0].position)).toBe(
      "Le code général des impôts est ainsi modifié",
    )
    expect(context.text(references[1].position)).toBe(
      "Au chapitre II bis du titre premier de la première partie du livre premier",
    )
    expect(context.text(references[2].position)).toBe("A l'article 223 VK")
    expect(context.text(references[3].position)).toBe(
      "l'article 223 VO quaterdecies, il est inséré",
    )
    expect(context.text(references[4].position)).toBe(
      "au 3° de l'article 223 VO bis",
    )
  })

  test("Références dans citation multi-lignes", () => {
    const input = dedent`
      « Art. 223 VO quindecies. - Sur option exercée par l'entité constitutive déclarante, et par dérogation au 3° de l'article 223 VO bis, les plus ou moins-values sur participations sont incluses dans le résultat qualifié d'une entité constitutive.
      « L'option mentionnée au premier alinéa est valable pour une période de cinq exercices, à compter de celui au titre duquel elle est exercée, et s'applique à toutes les entités constitutives situées dans l'État ou le territoire pour lequel elle a été formulée. Elle est formulée sur la déclaration mentionnée au II de l'article 223 WW souscrite au titre du premier exercice d'application. Elle est reconduite tacitement, sauf renonciation formulée par l'entité constitutive déclarante sur la déclaration mentionnée au même II souscrite au titre du dernier exercice d'application de l'option.
      « En cas de renonciation, une nouvelle option ne peut pas être exercée au titre des cinq exercices suivant le dernier exercice d'application de l'option. La renonciation ne peut porter sur des participations pour lesquelles une perte ou une moins-value a été prise en compte dans le résultat qualifié. » ;
           `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
    expect(references).toStrictEqual([
      {
        definition: true,
        num: "223 VO quindecies",
        position: {
          start: 2,
          stop: 24,
        },
        type: "article",
      },
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
    expect(context.text(references[0].position)).toBe("Art. 223 VO quindecies")
    expect(context.text(references[1].position)).toBe(
      "au 3° de l'article 223 VO bis",
    )
    expect(context.text(references[2].position)).toBe("au premier alinéa")
    expect(context.text(references[3].position)).toBe(
      "au II de l'article 223 WW",
    )
  })

  test("Référence de type parent-child dans citation simple", async () => {
    const input = "« aux deux derniers alinéas de l'article 223 WA ter »"
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
    expect(references).toStrictEqual([
      {
        child: {
          count: 2,
          first: {
            index: -1,
            num: "derniers",
            type: "alinéa",
          },
          position: {
            start: 6,
            stop: 27,
          },
          type: "counted-interval",
        },
        parent: {
          num: "223 WA ter",
          position: {
            start: 33,
            stop: 51,
          },
          type: "article",
        },
        position: {
          start: 2,
          stop: 51,
        },
        type: "parent-enfant",
      },
    ])
    const reference0 = references[0] as TextAstParentChild
    expect(context.text(reference0.position)).toBe(
      "aux deux derniers alinéas de l'article 223 WA ter",
    )
    const reference1 = reference0.parent
    expect(context.text(reference1.position)).toBe("article 223 WA ter")
    const reference2 = reference0.child
    expect(context.text(reference2.position)).toBe("deux derniers alinéas")
  })

  test("Références de type article dans citation simple", () => {
    const input = dedent`
      « III bis. - Par dérogation au I du présent article, le taux prévu à l'article 278 [...] »
    `
    const context = new TextParserContext(input)
    const references = getParsedReferences(context)
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
    const references = getParsedReferences(context)
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
        titleRest: "de finances pour 2012",
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

describe("getParsedReferencesWithOriginalTransformations", () => {
  test("<span>au <i>I</i> de l'article 7 du <b>code pénal</b></span>", ({
    task,
  }) => {
    const html = task.name
    const transformation = simplifyHtml({ removeAWithHref: true })(html)
    const text = transformation.output
    expect(text).toBe("au I de l'article 7 du code pénal")

    const context = new TextParserContext(text)
    const references = getParsedReferencesWithOriginalTransformations(
      context,
      transformation,
    )
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(reference).toStrictEqual({
      child: {
        child: {
          index: 1,
          num: "I",
          originalTransformation: {
            position: {
              start: 12,
              stop: 13,
            },
          },
          position: {
            start: 3,
            stop: 4,
          },
          type: "item",
        },
        originalTransformation: {
          position: {
            start: 9,
            stop: 32,
          },
        },
        parent: {
          num: "7",
          originalTransformation: {
            position: {
              start: 23,
              stop: 32,
            },
          },
          position: {
            start: 10,
            stop: 19,
          },
          type: "article",
        },
        position: {
          start: 3,
          stop: 19,
        },
        type: "parent-enfant",
      },
      originalTransformation: {
        position: {
          start: 6,
          stop: 53,
        },
      },
      parent: {
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        originalTransformation: {
          position: {
            start: 39,
            stop: 49,
          },
        },
        position: {
          start: 23,
          stop: 33,
        },
        title: "Code pénal",
        titleRest: "pénal",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 33,
      },
      type: "parent-enfant",
    })
    expect(
      reverseTransformedInnerFragment(html, reference.originalTransformation),
    ).toBe("au <i>I</i> de l'article 7 du <b>code pénal</b>")
    expect(
      reverseTransformedInnerFragment(
        html,
        reference.parent.originalTransformation,
      ),
    ).toBe("code pénal")
    expect(
      reverseTransformedInnerFragment(
        html,
        reference.child.originalTransformation,
      ),
    ).toBe("<i>I</i> de l'article 7")
    expect(
      reverseTransformedInnerFragment(
        html,
        (reference.child as TextAstParentChild).parent.originalTransformation,
      ),
    ).toBe("article 7")
    expect(
      reverseTransformedInnerFragment(
        html,
        (reference.child as TextAstParentChild).child.originalTransformation,
      ),
    ).toBe("I")
  })

  test("<span>au <i>I de l'a</i>rticle <b>7 du code</b> pénal</span>", ({
    task,
  }) => {
    const html = task.name
    const transformation = simplifyHtml({ removeAWithHref: true })(html)
    const text = transformation.output
    expect(text).toBe("au I de l'article 7 du code pénal")

    const context = new TextParserContext(text)
    const references = getParsedReferencesWithOriginalTransformations(
      context,
      transformation,
    )
    expect(references.length).toBe(1)
    const reference = references[0] as TextAstParentChild
    expect(reference).toStrictEqual({
      child: {
        child: {
          index: 1,
          num: "I",
          originalTransformation: {
            position: {
              start: 12,
              stop: 13,
            },
          },
          position: {
            start: 3,
            stop: 4,
          },
          type: "item",
        },
        originalTransformation: {
          innerSuffix: "</b>",
          outerSuffix: "<b>",
          position: {
            start: 9,
            stop: 35,
          },
        },
        parent: {
          num: "7",
          originalTransformation: {
            innerPrefix: "<i>",
            innerSuffix: "</b>",
            outerPrefix: "</i>",
            outerSuffix: "<b>",
            position: {
              start: 19,
              stop: 35,
            },
          },
          position: {
            start: 10,
            stop: 19,
          },
          type: "article",
        },
        position: {
          start: 3,
          stop: 19,
        },
        type: "parent-enfant",
      },
      originalTransformation: {
        position: {
          start: 6,
          stop: 53,
        },
      },
      parent: {
        cid: "LEGITEXT000006070719",
        nature: "CODE",
        originalTransformation: {
          innerPrefix: "<b>",
          outerPrefix: "</b>",
          position: {
            start: 39,
            stop: 53,
          },
        },
        position: {
          start: 23,
          stop: 33,
        },
        title: "Code pénal",
        titleRest: "pénal",
        type: "texte",
      },
      position: {
        start: 0,
        stop: 33,
      },
      type: "parent-enfant",
    })
    expect(
      reverseTransformedInnerFragment(html, reference.originalTransformation),
    ).toBe("au <i>I de l'a</i>rticle <b>7 du code</b> pénal")
    expect(
      reverseTransformedInnerFragment(
        html,
        reference.parent.originalTransformation,
      ),
    ).toBe("<b>code</b> pénal")
    expect(
      reverseTransformedInnerFragment(
        html,
        reference.child.originalTransformation,
      ),
    ).toBe("<i>I de l'a</i>rticle <b>7</b>")
    expect(
      reverseTransformedInnerFragment(
        html,
        (reference.child as TextAstParentChild).parent.originalTransformation,
      ),
    ).toBe("<i>a</i>rticle <b>7</b>")
    expect(
      reverseTransformedInnerFragment(
        html,
        (reference.child as TextAstParentChild).child.originalTransformation,
      ),
    ).toBe("I")
  })
})
