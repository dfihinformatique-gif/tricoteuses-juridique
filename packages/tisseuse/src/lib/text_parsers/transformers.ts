import type {
  FragmentPosition,
  FragmentReverseTransformation,
} from "./fragments.js"

export interface SourceMapSegment {
  inputIndex: number
  inputLength: number
  matchingSegmentIndex?: number
  /**
   * Added only by `convertHtmlElementsToText`
   *
   * It allows `iterOriginalMergedPositionsFromTransformed` function
   * to reorganize HTML elements.
   */
  openingTag?: string
  outputIndex: number
  outputLength: number
}

export type Transformation = TransformationLeaf | TransformationNode

export interface TransformationLeaf {
  input: string
  output: string
  sourceMap: SourceMapSegment[]
  title: string
}

export interface TransformationNode {
  input: string
  output: string
  transformations: Transformation[]
  title: string
}

export type Transformer = (text: string) => Transformation

export type TransformerLeaf = (text: string) => TransformationLeaf

export type TransformerNode = (text: string) => TransformationNode

export const tagRegExp = /^<\/?(!DOCTYPE|\?XML|[A-Z][A-Z0-9]*)/i

export function chainTransformers(
  title: string,
  transformers: Array<Transformer>,
): TransformerNode {
  return (input: string): TransformationNode => {
    const transformations: Transformation[] = []
    let text = input
    for (const transformer of transformers) {
      const transformation = transformer(text)
      if (
        (transformation as TransformationNode).transformations !== undefined ||
        (transformation as TransformationLeaf).sourceMap.length !== 0
      ) {
        transformations.push(transformation)
        text = transformation.output
      }
    }
    return { input, output: text, title, transformations }
  }
}

function* iterTransformationLeafs(
  transformation: Transformation,
): Generator<TransformationLeaf, void> {
  if ((transformation as TransformationNode).transformations === undefined) {
    yield transformation as TransformationLeaf
  } else {
    for (const subTransformation of (transformation as TransformationNode)
      .transformations) {
      yield* iterTransformationLeafs(subTransformation)
    }
  }
}

/**
 * Generator that converts transformed (e.g. simplified) positions to original
 * (e.g. HTML) positions
 *
 * When a position is included in fragments of HTML elements, the elements are
 * either split (for spans) or the position is enlarged to include the whole
 * elements (for blocks).
 *
 * Use this generator to insert HTML elements (links, spans, etc).
 */
function* iterOriginalMergedPositionsFromTransformed(
  transformation: Transformation,
): Generator<
  FragmentReverseTransformation,
  void,
  FragmentPosition | undefined
> {
  const transformationLeafs = [
    ...iterTransformationLeafs(transformation),
  ].reverse()
  let fragmentReverseTransformation: FragmentReverseTransformation | undefined =
    {
      position: { start: 0, stop: 0 },
    }
  const transformationIterators = transformationLeafs.map(
    (transformationLeaf) => {
      const transformationIterator =
        iterOriginalMergedPositionsFromTransformedUsingTransformationLeaf(
          transformationLeaf,
        )
      // Launch iterator using a dummy position and ignore the result.
      transformationIterator.next(fragmentReverseTransformation)
      return transformationIterator
    },
  )
  // Send a dummy value and ask for the first position.
  let position = yield fragmentReverseTransformation
  while (position !== undefined) {
    fragmentReverseTransformation = {
      position: position,
    }
    for (const transformationIterator of transformationIterators) {
      const result = transformationIterator.next(fragmentReverseTransformation)
      if (result.done) {
        return
      }
      fragmentReverseTransformation = result.value
    }
    position = yield fragmentReverseTransformation
  }
  // Stop the transformationIterators.
  for (const transformationIterator of transformationIterators) {
    transformationIterator.next(undefined)
  }
}

function* iterOriginalMergedPositionsFromTransformedUsingTransformationLeaf(
  transformation: TransformationLeaf,
): Generator<
  FragmentReverseTransformation,
  void,
  FragmentReverseTransformation | undefined
> {
  let fragmentReverseTransformation = yield {
    position: { start: 0, stop: 0 },
  }

  // Insert empty segment at start & end.
  const sourceMap = [
    { inputIndex: 0, inputLength: 0, outputIndex: 0, outputLength: 0 },
    ...transformation.sourceMap,
    {
      inputIndex: Number.MAX_SAFE_INTEGER,
      inputLength: 0,
      outputIndex: Number.MAX_SAFE_INTEGER,
      outputLength: 0,
    },
  ]
  let startSegmentIndex = 0
  let startSegment = sourceMap[startSegmentIndex]
  while (true) {
    if (fragmentReverseTransformation === undefined) {
      return
    }
    let { position: transformedPosition } = fragmentReverseTransformation
    let innerPrefix: string | undefined = undefined
    let innerSuffix: string | undefined = undefined
    let outerPrefix: string | undefined = undefined
    let outerSuffix: string | undefined = undefined
    while (
      startSegment.outputIndex + startSegment.outputLength >
      transformedPosition.start
    ) {
      startSegmentIndex--
      startSegment = sourceMap[startSegmentIndex]
    }
    for (let nextSegmentIndex = startSegmentIndex + 1; ; nextSegmentIndex++) {
      const nextSegment = sourceMap[nextSegmentIndex]
      if (
        nextSegment.outputIndex + nextSegment.outputLength >
        transformedPosition.start
      ) {
        break
      }
      startSegmentIndex = nextSegmentIndex
      startSegment = nextSegment
    }

    let stopSegmentIndex = startSegmentIndex
    let stopSegment = startSegment
    while (stopSegment.outputIndex < transformedPosition.stop) {
      stopSegmentIndex++
      stopSegment = sourceMap[stopSegmentIndex]
    }

    // If opening or closing segments are missing, include them.
    let firstIncludedSegmentIndex =
      transformedPosition.start <
      startSegment.outputIndex + startSegment.outputLength
        ? startSegmentIndex!
        : startSegmentIndex! + 1
    let lastIncludedSegmentIndex =
      transformedPosition.stop > stopSegment.outputIndex
        ? stopSegmentIndex
        : stopSegmentIndex - 1
    for (let areaExtended = true; areaExtended; ) {
      areaExtended = false
      innerPrefix = undefined
      innerSuffix = undefined
      outerPrefix = undefined
      outerSuffix = undefined
      for (
        let includedSegmentIndex = firstIncludedSegmentIndex;
        includedSegmentIndex <= lastIncludedSegmentIndex;
        includedSegmentIndex++
      ) {
        const matchingSegmentIndex =
          sourceMap[includedSegmentIndex].matchingSegmentIndex
        if (matchingSegmentIndex !== undefined) {
          // Note: Add 1 to matchingSegmentIndex, because of empty segment
          // inserted at start of source map.
          if (matchingSegmentIndex + 1 < firstIncludedSegmentIndex) {
            let tagAddedToFragment = false
            const openingSegment = sourceMap[matchingSegmentIndex + 1]
            if (
              openingSegment.openingTag !== undefined &&
              openingSegment.outputIndex + openingSegment.outputLength <
                transformedPosition.start
            ) {
              const tagMatch = openingSegment.openingTag.match(tagRegExp)
              if (tagMatch !== null) {
                const tagName = tagMatch[1]
                const tagNameUpperCase = tagName.toUpperCase()
                if (
                  ["B", "EM", "I", "SPAN", "STRONG", "SUB", "SUP"].includes(
                    tagNameUpperCase,
                  )
                ) {
                  // Split the span into 2 identical spans.
                  outerPrefix = `${outerPrefix ?? ""}</${tagName}>`
                  innerPrefix = `${openingSegment.openingTag}${innerPrefix ?? ""}`
                  tagAddedToFragment = true
                }
              }
            }
            if (!tagAddedToFragment) {
              // Extend transformedPosition to include added opening segment.

              // If an included element was split, undo the split.
              innerPrefix = undefined
              outerPrefix = undefined

              firstIncludedSegmentIndex = matchingSegmentIndex + 1
              const firstIncludedSegment = sourceMap[firstIncludedSegmentIndex]
              transformedPosition = {
                start: firstIncludedSegment.outputIndex,
                stop: transformedPosition.stop,
              }
              areaExtended = true
              break
            }
          }
          if (matchingSegmentIndex + 1 > lastIncludedSegmentIndex) {
            let tagAddedToFragment = false
            const openingSegment = sourceMap[includedSegmentIndex]
            const closingSegment = sourceMap[matchingSegmentIndex + 1]
            if (
              openingSegment.openingTag !== undefined &&
              transformedPosition.stop < closingSegment.outputIndex
            ) {
              const tagMatch = openingSegment.openingTag.match(tagRegExp)
              if (tagMatch !== null) {
                const tagName = tagMatch[1]
                const tagNameUpperCase = tagName.toUpperCase()
                if (
                  ["B", "EM", "I", "SPAN", "STRONG", "SUB", "SUP"].includes(
                    tagNameUpperCase,
                  )
                ) {
                  // Split the span into 2 identical spans.
                  innerSuffix = `${innerSuffix ?? ""}</${tagName}>`
                  outerSuffix = `${openingSegment.openingTag}${outerSuffix ?? ""}`
                  tagAddedToFragment = true
                }
              }
            }
            if (!tagAddedToFragment) {
              // Extend transformedPosition to include added closing segment.

              // If an included element was split, undo the split.
              innerSuffix = undefined
              outerSuffix = undefined

              lastIncludedSegmentIndex = matchingSegmentIndex + 1
              const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
              transformedPosition = {
                start: transformedPosition.start,
                stop:
                  lastIncludedSegment.outputIndex +
                  lastIncludedSegment.outputLength,
              }
              areaExtended = true
              break
            }
          }
        }
      }
    }

    const segmentBefore = sourceMap[firstIncludedSegmentIndex - 1]
    const originalStart =
      segmentBefore.inputIndex +
      segmentBefore.inputLength +
      transformedPosition.start -
      (segmentBefore.outputIndex + segmentBefore.outputLength)

    const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
    const originalStop =
      lastIncludedSegment.inputIndex +
      lastIncludedSegment.inputLength +
      transformedPosition.stop -
      (lastIncludedSegment.outputIndex + lastIncludedSegment.outputLength)

    fragmentReverseTransformation = yield Object.fromEntries(
      Object.entries({
        innerPrefix:
          `${innerPrefix ?? ""}${fragmentReverseTransformation.innerPrefix ?? ""}` ||
          undefined,
        innerSuffix:
          `${fragmentReverseTransformation.innerSuffix ?? ""}${innerSuffix ?? ""}` ||
          undefined,
        outerPrefix:
          `${fragmentReverseTransformation.outerPrefix ?? ""}${outerPrefix ?? ""}` ||
          undefined,
        outerSuffix:
          `${outerSuffix ?? ""}${fragmentReverseTransformation.outerSuffix ?? ""}` ||
          undefined,
        position: {
          start: originalStart,
          stop: originalStop,
        },
      }).filter(([, value]) => value !== undefined),
    ) as unknown as FragmentReverseTransformation
  }
}

/**
 * Creates an iterator that converts transformed (e.g. simplified) positions to original
 * (e.g. HTML) positions
 *
 * When a position is included in fragments of HTML elements, the elements are
 * either split (for spans) or the position is enlarged to include the whole
 * elements (for blocks).
 *
 * Use this iterator to insert HTML elements (links, spans, etc).
 */
export function newReverseTransformationsMergedFromPositionsIterator(
  transformation: Transformation,
): Generator<
  FragmentReverseTransformation,
  void,
  FragmentPosition | undefined
> {
  const originalPositionsFromTransformedIterator =
    iterOriginalMergedPositionsFromTransformed(transformation)
  // Initialize iterator by sending a dummy value and ignoring the result.
  originalPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
  return originalPositionsFromTransformedIterator
}

/**
 * Converts an array of transformed (e.g. simplified) positions to an array
 * of arrays of original (e.g. HTML) positions (one array of original positions
 * for each transformed position)
 *
 * Each position is split to ensure that it doesn't contain any HTML element.
 *
 * The positions must be sorted in ascending order.
 *
 * Use this function for diffs.
 */
export function reversePositionsSplitFromPositions(
  transformation: Transformation,
  transformedPositions: FragmentPosition[],
): Array<FragmentPosition[]> {
  let positions = transformedPositions.map((position) => [position])
  for (const { sourceMap } of [
    ...iterTransformationLeafs(transformation),
  ].reverse()) {
    positions = reversePositionsSplitFromPositionsUsingSourceMap(
      sourceMap,
      positions,
    )
  }
  return positions
}

/**
 * Note: The original positions are split when they overlap.
 * So, there may be more original positions than transformed positions.
 */
function reversePositionsSplitFromPositionsUsingSourceMap(
  sourceMap: SourceMapSegment[],
  transformedPositions: Array<FragmentPosition[]>,
): Array<FragmentPosition[]> {
  const originalPositions: Array<FragmentPosition[]> = []
  // Insert empty segment at start & end.
  sourceMap = [
    { inputIndex: 0, inputLength: 0, outputIndex: 0, outputLength: 0 },
    ...sourceMap,
    {
      inputIndex: Number.MAX_SAFE_INTEGER,
      inputLength: 0,
      outputIndex: Number.MAX_SAFE_INTEGER,
      outputLength: 0,
    },
  ]
  let segmentIndex = 0
  let segment = sourceMap[segmentIndex]
  for (const transformedPositionsAtIndex of transformedPositions) {
    const originalPositionsAtIndex: FragmentPosition[] = []
    originalPositions.push(originalPositionsAtIndex)
    for (const transformedPosition of transformedPositionsAtIndex) {
      let { start: transformedStart } = transformedPosition
      const { stop: transformedStop } = transformedPosition

      transformPosition: for (
        let positionReverseTransformed = false;
        !positionReverseTransformed;

      ) {
        for (
          ;
          segment.outputIndex + segment.outputLength <= transformedStart;
          segmentIndex++, segment = sourceMap[segmentIndex]
        );
        let firstIncludedSegmentIndex = segmentIndex
        const segmentBefore = sourceMap[firstIncludedSegmentIndex - 1]
        let originalStart =
          segmentBefore.inputIndex +
          segmentBefore.inputLength +
          transformedStart -
          (segmentBefore.outputIndex + segmentBefore.outputLength)

        let lastIncludedSegmentIndex: number
        for (
          lastIncludedSegmentIndex = firstIncludedSegmentIndex - 1;
          sourceMap[lastIncludedSegmentIndex + 1].outputIndex < transformedStop;
          lastIncludedSegmentIndex++
        );
        const lastIncludedSegment = sourceMap[lastIncludedSegmentIndex]
        let originalStop =
          lastIncludedSegment.inputIndex +
          lastIncludedSegment.inputLength +
          transformedStop -
          (lastIncludedSegment.outputIndex + lastIncludedSegment.outputLength)

        for (
          let includedSegmentIndex = firstIncludedSegmentIndex;
          includedSegmentIndex <= lastIncludedSegmentIndex;
          includedSegmentIndex++
        ) {
          const includedSegment = sourceMap[includedSegmentIndex]
          const matchingSegmentIndex = includedSegment.matchingSegmentIndex
          if (matchingSegmentIndex !== undefined) {
            // Note: Add 1 to matchingSegmentIndex, because of empty segment
            // inserted at start of source map.
            if (matchingSegmentIndex + 1 < firstIncludedSegmentIndex) {
              const matchingSegment = sourceMap[matchingSegmentIndex + 1]
              if (matchingSegment.outputIndex < transformedStart) {
                // Split transformed position.
                if (includedSegment.inputIndex > originalStart) {
                  originalPositionsAtIndex.push({
                    start: originalStart,
                    stop: includedSegment.inputIndex,
                  })
                }
                transformedStart =
                  includedSegment.outputIndex + includedSegment.outputLength
                // Ignore following segments whose output are empty.
                for (
                  let nextSegmentIndex = includedSegmentIndex,
                    nextSegment = includedSegment;
                  nextSegment.outputIndex + nextSegment.outputLength ===
                  transformedStart;
                  nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
                ) {
                  segmentIndex = nextSegmentIndex
                }
                // Handle remaining split position.
                continue transformPosition
              }
              firstIncludedSegmentIndex = matchingSegmentIndex + 1
              originalStart = matchingSegment.inputIndex
            } else if (matchingSegmentIndex + 1 > lastIncludedSegmentIndex) {
              const matchingSegment = sourceMap[matchingSegmentIndex + 1]
              if (
                matchingSegment.outputIndex + matchingSegment.outputLength >
                transformedStop
              ) {
                // Split transformed position.
                if (includedSegment.inputIndex > originalStart) {
                  originalPositionsAtIndex.push({
                    start: originalStart,
                    stop: includedSegment.inputIndex,
                  })
                }
                transformedStart =
                  includedSegment.outputIndex + includedSegment.outputLength
                // Ignore following segments whose output are empty.
                for (
                  let nextSegmentIndex = includedSegmentIndex,
                    nextSegment = includedSegment;
                  nextSegment.outputIndex + nextSegment.outputLength ===
                  transformedStart;
                  nextSegmentIndex++, nextSegment = sourceMap[nextSegmentIndex]
                ) {
                  segmentIndex = nextSegmentIndex
                }
                // Handle remaining split position.
                continue transformPosition
              }
              lastIncludedSegmentIndex = matchingSegmentIndex + 1
              originalStop =
                matchingSegment.inputIndex + matchingSegment.inputLength
            }
          }
        }
        originalPositionsAtIndex.push({
          start: originalStart,
          stop: originalStop,
        })
        positionReverseTransformed = true
      }
    }
  }
  return originalPositions
}

/**
 * Converts an array of transformed (e.g. simplified) positions to an array
 *  of original (e.g. HTML) positions
 *
 * When a position is included in fragments of HTML elements, the elements are
 * either split (for spans) or the position is enlarged to include the whole
 * elements (for blocks).
 *
 * Use this function to insert HTML elements (links, spans, etc).
 */
export function reverseTransformationsMergedFromPositions(
  transformation: Transformation,
  transformedPositions: FragmentPosition[],
): FragmentReverseTransformation[] {
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(transformation)
  return transformedPositions.map((transformedPosition) =>
    reverseTransformationFromPosition(
      originalPositionsFromTransformedIterator,
      transformedPosition,
    ),
  )
}

/**
 * Use an iterator that converts transformed (e.g. simplified) positions to original
 * (e.g. HTML) positions, to get an original position from a transformed position.
 */
export function reverseTransformationFromPosition(
  originalPositionsFromTransformedIterator: Generator<
    FragmentReverseTransformation,
    void,
    FragmentPosition | undefined
  >,
  transformedPosition: FragmentPosition,
): FragmentReverseTransformation {
  const result =
    originalPositionsFromTransformedIterator.next(transformedPosition)
  if (result.done) {
    throw new Error(
      `Reverse transformation of position failed: ${transformedPosition}`,
    )
  }
  return result.value
}

export const reverseTransformedInnerFragment = <
  StringOrUndefined extends string | undefined,
>(
  originalText: string,
  originalTransformation: FragmentReverseTransformation | undefined,
  offset = 0,
): StringOrUndefined =>
  originalTransformation === undefined
    ? (originalText as StringOrUndefined)
    : (((originalTransformation.innerPrefix ?? "") +
        originalText.slice(
          originalTransformation.position.start + offset,
          originalTransformation.position.stop + offset,
        ) +
        (originalTransformation.innerSuffix ?? "")) as StringOrUndefined)

export const reverseTransformedReplacement = (
  originalTransformation: FragmentReverseTransformation,
  replacement: string,
): string =>
  (originalTransformation.outerPrefix ?? "") +
  replacement +
  (originalTransformation.outerSuffix ?? "")
