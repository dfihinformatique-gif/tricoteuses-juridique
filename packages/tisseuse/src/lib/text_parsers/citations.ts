import { alternatives, chain, regExp, repeat, type TextAst } from "./core.js"
import { espaceOuRien } from "./typography.js"

export const citationLigne = regExp(String.raw`« ?([^»\n]+)`, {
  flags: "d",
  value: (context) => {
    let stop = context.offset + context.match!.indices![1][1]
    if (context.match![1].endsWith(" ")) {
      stop--
    }
    return {
      position: {
        start: context.offset + context.match!.indices![1][0],
        stop,
      },
    }
  },
})

export const citationSimple = regExp(String.raw`« ?(.*?) ?»`, {
  flags: "d",
  value: (context) => ({
    content: [
      {
        position: {
          start: context.offset + context.match!.indices![1][0],
          stop: context.offset + context.match!.indices![1][1],
        },
      },
    ],
    position: context.position(),
    type: "citation",
  }),
})

export const citation = alternatives(
  chain(
    [
      regExp(String.raw`\n`),
      repeat(citationLigne, {
        separator: regExp(String.raw`»?\n`),
        // Remove separators from results.
        value: ({ results }) =>
          results.map((result, index) =>
            index === 0 ? result : (result as TextAst[])[1],
          ),
      }),
      regExp("»"),
    ],
    {
      value: (context) => ({
        content: context.results[1],
        position: context.position(),
        type: "citation",
      }),
    },
  ),
  chain([espaceOuRien, citationSimple], { value: ({ results }) => results[1] }),
)
