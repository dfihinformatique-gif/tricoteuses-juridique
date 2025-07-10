import { regExp } from "./core.js"

export const citationLigne = regExp(String.raw`« ?(.*?)( ?»)?\n`, {
  flags: "d",
  value: (context) => ({
    content: [
      {
        position: {
          start: context.offset + context.match!.indices![1][0],
          stop: context.offset + context.match!.indices![1][1],
        },
        text: context.match![1],
      },
    ],
    position: context.position(),
    text: context.text(),
    type: "citation",
  }),
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
        text: context.match![1],
      },
    ],
    position: context.position(),
    text: context.text(),
    type: "citation",
  }),
})
