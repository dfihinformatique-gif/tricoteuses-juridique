import { type TextAst, type TextAstCitation } from "./ast.js"
import {
  alternatives,
  chain,
  regExp,
  repeat,
  TextParserContext,
} from "./parsers.js"
import type { TransformationLeaf } from "./transformers.js"
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

export function convertCitationToText(
  context: TextParserContext,
  citation: TextAstCitation,
): TransformationLeaf {
  let currentOutputIndex = 0
  const firstPosition = citation.content[0].position
  const lastPosition = citation.content.at(-1)!.position
  const output = citation.content
    .map(({ position }) => context.input.slice(position.start, position.stop))
    .join("\n")
  return {
    input: context.text(citation.position),
    output,
    sourceMap: [
      {
        inputIndex: citation.position.start,
        inputLength: firstPosition.start - citation.position.start,
        outputIndex: 0,
        outputLength: 0,
      },
      ...citation.content.slice(0, -1).map(({ position }, index) => {
        const nextPosition = citation.content[index + 1].position
        const outputIndex = currentOutputIndex + position.stop - position.start
        currentOutputIndex = outputIndex + 1
        return {
          inputIndex: position.stop,
          inputLength: nextPosition.start - position.stop,
          outputIndex,
          outputLength: 1, // "\n"
        }
      }),
      {
        inputIndex: lastPosition.stop,
        inputLength: citation.position.stop - lastPosition.stop,
        outputIndex: output.length,
        outputLength: 0,
      },
    ],
    title: "Conversion de citation",
  }
}
