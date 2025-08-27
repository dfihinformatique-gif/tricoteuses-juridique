import fs from "fs-extra"

import {
  type Conversion,
  type ConversionLeaf,
  type ConversionNode,
} from "$lib/text_simplifiers.js"

export function writeConversion(
  filePathCore: string,
  conversion: Conversion,
  { recursive }: { recursive?: boolean } = {},
): void {
  if ((conversion as ConversionNode).conversions === undefined) {
    fs.writeJsonSync(
      `${filePathCore}_conversion.json`,
      {
        sourceMap: (conversion as ConversionLeaf).sourceMap,
        title: conversion.title,
      },
      { encoding: "utf-8", spaces: 2 },
    )
  } else if (recursive) {
    for (const [index, child] of (
      conversion as ConversionNode
    ).conversions.entries()) {
      writeConversion(`${filePathCore}.${index + 1}`, child, { recursive })
    }
  }
  if (conversion.output !== undefined) {
    fs.writeFileSync(`${filePathCore}_simplifié.html`, conversion.output, {
      encoding: "utf-8",
    })
  }
}
