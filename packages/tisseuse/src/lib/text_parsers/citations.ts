import { type TextAst } from "./ast.js"
import { alternatives, chain, regExp, repeat } from "./parsers.js"
import { espaceOuRien } from "./typography.js"

export const citationLigne = regExp(String.raw`« ?([^»\n]+)`, {
  flags: "d",
  value: (match) => {
    let stop = match.indices![1][1]
    if (match[1].endsWith(" ")) {
      stop--
    }
    return {
      position: {
        start: match.indices![1][0],
        stop,
      },
    }
  },
})

export const citationSimple = regExp(String.raw`« ?(.*?) ?»`, {
  flags: "d",
  value: (match, context) => ({
    content: [
      {
        position: {
          start: match.indices![1][0],
          stop: match.indices![1][1],
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
        value: (results) =>
          results.map((result, index) =>
            index === 0 ? result : (result as TextAst[])[1],
          ),
      }),
      regExp("»"),
    ],
    {
      value: (results, context) => ({
        content: results[1],
        position: context.position(),
        type: "citation",
      }),
    },
  ),
  chain([espaceOuRien, citationSimple], { value: (results) => results[1] }),
)
