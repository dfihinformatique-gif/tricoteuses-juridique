import fs from "fs-extra"
import path from "node:path"

import type {
  SourceMapSegment,
  Transformation,
  TransformationLeaf,
  TransformationNode,
} from "$lib/text_parsers/transformers.js"

export function readTransformation(
  inputDocument: string,
  transformationDir: string,
): Transformation {
  const filenamePrefix = "transformation_"
  const jsonFilenameSuffix = ".json"
  const rootTransformation: Partial<Transformation> = {}
  for (const filename of fs.readdirSync(transformationDir).toSorted()) {
    if (
      filename.startsWith(filenamePrefix) &&
      filename.endsWith(jsonFilenameSuffix)
    ) {
      const indexesPath = filename.slice(
        filenamePrefix.length,
        -jsonFilenameSuffix.length,
      )
      const indexes = indexesPath.split(".").map((index) => parseInt(index) - 1)
      let currentTransformation = rootTransformation
      for (const index of indexes.slice(1)) {
        const transformations: Array<Partial<Transformation>> = ((
          currentTransformation as TransformationNode
        ).transformations ??= [])
        while (index >= transformations.length) {
          transformations.push({})
        }
        currentTransformation = transformations[index]
      }
      currentTransformation.output = fs.readFileSync(
        path.join(transformationDir, `${filenamePrefix}${indexesPath}.html`),
        {
          encoding: "utf-8",
        },
      )
      const { sourceMap, title } = fs.readJsonSync(
        path.join(transformationDir, filename),
        {
          encoding: "utf-8",
        },
      ) as { sourceMap?: SourceMapSegment[]; title: string }
      ;(currentTransformation as TransformationLeaf).sourceMap = sourceMap ?? []
      currentTransformation.title = title
    }
  }
  setTransformationInput(rootTransformation as Transformation, inputDocument)
  return rootTransformation as Transformation
}

function setTransformationInput(
  transformation: Transformation,
  input: string,
): string {
  transformation.input = input
  if ((transformation as TransformationNode).transformations !== undefined) {
    for (const childTransformation of (transformation as TransformationNode)
      .transformations) {
      setTransformationInput(childTransformation, input)
      input = childTransformation.output
    }
  }
  return input
}

export function writeTransformation(
  transformation: Transformation,
  transformationDir: string,
  indexesPath = "1",
): void {
  fs.ensureDirSync(transformationDir)
  if ((transformation as TransformationNode).transformations === undefined) {
    fs.writeJsonSync(
      path.join(transformationDir, `transformation_${indexesPath}.json`),
      {
        sourceMap: (transformation as TransformationLeaf).sourceMap,
        title: transformation.title,
      },
      { encoding: "utf-8", spaces: 2 },
    )
  } else {
    fs.writeJsonSync(
      path.join(transformationDir, `transformation_${indexesPath}.json`),
      {
        title: transformation.title,
      },
      { encoding: "utf-8", spaces: 2 },
    )
    for (const [index, childTransformation] of (
      transformation as TransformationNode
    ).transformations.entries()) {
      writeTransformation(
        childTransformation,
        transformationDir,
        `${indexesPath}.${index + 1}`,
      )
    }
  }
  if (transformation.output !== undefined) {
    fs.writeFileSync(
      path.join(transformationDir, `transformation_${indexesPath}.html`),
      transformation.output,
      {
        encoding: "utf-8",
      },
    )
  }
}
