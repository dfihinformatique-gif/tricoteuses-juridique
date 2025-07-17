import { describe, expect, test } from "vitest"

import { getReferences } from "./index.js"
import { TextParserContext } from "./parsers.js"

describe("getReferences", () => {
  test("les articles 135-7 et 135-9 bis de la loi n°94-839 du 9 janvier 1994 ; à la première phrase du deuxième alinéa du a du I de l'article 219", ({
    task,
  }) => {
    const context = new TextParserContext(task.name)
    const references = getReferences(context)
    expect(references.length).toBe(2)
    expect(references).toStrictEqual([
      {
        child: {
          coordinator: "et",
          left: {
            id: "135-7",
            position: {
              start: 13,
              stop: 18,
            },
            type: "article",
          },
          position: {
            start: 4,
            stop: 31,
          },
          right: {
            id: "135-9 bis",
            position: {
              start: 22,
              stop: 31,
            },
            type: "article",
          },
          type: "enumeration",
        },
        parent: {
          lawDate: "1994-01-09",
          lawType: "loi",
          num: "94-839",
          position: {
            start: 38,
            stop: 68,
          },
          type: "law",
        },
        position: {
          start: 0,
          stop: 68,
        },
        type: "parent-enfant",
      },
      {
        child: {
          child: {
            child: {
              child: {
                index: 1,
                position: {
                  start: 76,
                  stop: 91,
                },
                type: "phrase",
              },
              parent: {
                index: 2,
                position: {
                  start: 95,
                  stop: 110,
                },
                type: "alinéa",
              },
              position: {
                start: 76,
                stop: 110,
              },
              type: "parent-enfant",
            },
            parent: {
              id: "a",
              index: 1,
              position: {
                start: 114,
                stop: 115,
              },
              type: "portion",
            },
            position: {
              start: 76,
              stop: 115,
            },
            type: "parent-enfant",
          },
          parent: {
            id: "I",
            index: 1,
            position: {
              start: 119,
              stop: 120,
            },
            type: "portion",
          },
          position: {
            start: 76,
            stop: 120,
          },
          type: "parent-enfant",
        },
        parent: {
          id: "219",
          position: {
            start: 126,
            stop: 137,
          },
          type: "article",
        },
        position: {
          start: 71,
          stop: 137,
        },
        type: "parent-enfant",
      },
    ])
    expect(context.textSlice(references[0].position)).toBe(
      "les articles 135-7 et 135-9 bis de la loi n°94-839 du 9 janvier 1994",
    )
    expect(context.textSlice(references[1].position)).toBe(
      "à la première phrase du deuxième alinéa du a du I de l'article 219",
    )
  })
})
