import { expect, test } from "vitest"

import { convertHtmlElementsToText } from "./texts_simplifiers.js"

test("simplify span", async () => {
  const { sourceMap, text } = convertHtmlElementsToText(
    "<span>Hello world!</span>",
  )
  expect(sourceMap).toStrictEqual([
    {
      inputIndex: 0,
      inputLength: 6,
      outputIndex: 0,
      outputLength: 0,
    },
    {
      inputIndex: 18,
      inputLength: 7,
      outputIndex: 12,
      outputLength: 0,
    },
  ])
  expect(text).toBe("Hello world!")
})

test("simplify span and text", async () => {
  const { sourceMap, text } = convertHtmlElementsToText(
    "<span>Hello</span> world!",
  )
  expect(sourceMap).toStrictEqual([
    {
      inputIndex: 0,
      inputLength: 6,
      outputIndex: 0,
      outputLength: 0,
    },
    {
      inputIndex: 11,
      inputLength: 7,
      outputIndex: 5,
      outputLength: 0,
    },
  ])
  expect(text).toBe("Hello world!")
})

test("simplify span ending with space and text", async () => {
  const { sourceMap, text } = convertHtmlElementsToText(
    "<span>Hello </span>world!",
  )
  expect(sourceMap).toStrictEqual([
    {
      inputIndex: 0,
      inputLength: 6,
      outputIndex: 0,
      outputLength: 0,
    },
    {
      inputIndex: 12,
      inputLength: 7,
      outputIndex: 6,
      outputLength: 0,
    },
  ])
  expect(text).toBe("Hello world!")
})
