import fs from "fs-extra"

import {
  type Transformation,
  type TransformationLeaf,
  type TransformationNode,
} from "$lib/text_parsers/simplifiers.js"

export function writeTransformation(
  filePathCore: string,
  transformation: Transformation,
  { recursive }: { recursive?: boolean } = {},
): void {
  if ((transformation as TransformationNode).transformations === undefined) {
    fs.writeJsonSync(
      `${filePathCore}_transformation.json`,
      {
        sourceMap: (transformation as TransformationLeaf).sourceMap,
        title: transformation.title,
      },
      { encoding: "utf-8", spaces: 2 },
    )
  } else if (recursive) {
    for (const [index, child] of (
      transformation as TransformationNode
    ).transformations.entries()) {
      writeTransformation(`${filePathCore}.${index + 1}`, child, { recursive })
    }
  }
  if (transformation.output !== undefined) {
    fs.writeFileSync(`${filePathCore}_simplifié.html`, transformation.output, {
      encoding: "utf-8",
    })
  }
}
