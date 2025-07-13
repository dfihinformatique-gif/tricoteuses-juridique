import type {
  TextAstAtomicReference,
  TextAstCompoundReference,
  TextAstEnumeration,
  TextAstReference,
  TextPosition,
} from "./ast.js"

export const createEnumerationOrBoundedInterval = (
  reference: TextAstReference,
  remaining: Array<["," | "à" | "et" | "ou" | "sauf", TextAstAtomicReference]>,
  position: TextPosition,
): TextAstReference => {
  // Parameter `remaining` is an array of the form
  // [[coordinator1, ref1], ...., [coordinatorN, refN]]
  // where `coordinators` are either "à", "et", "ou" & ",".
  if (remaining.length === 0) {
    // When there is no remaining, reference is always a compound reference.
    return {
      ...(reference as TextAstCompoundReference),
      position,
    }
  }
  const [coordinator, otherReference] = remaining[0]
  let mergedReference: TextAstReference
  if (coordinator === "sauf") {
    // Append exclusion to the deepest non-enumeration rigth of reference.
    let lastEnumerationReference:
      | TextAstEnumeration
      | TextAstAtomicReference
      | undefined = undefined
    for (
      let lastReference = reference;
      lastReference.type === "enumeration";
      lastReference = lastReference.right
    ) {
      lastEnumerationReference = lastReference
    }
    if (lastEnumerationReference === undefined) {
      // Add exclusion to reference.
      mergedReference = {
        left: reference,
        position: {
          start: reference.position.start,
          stop: otherReference.position.stop,
        },
        right: otherReference,
        type: "exclusion",
      }
    } else {
      // Add exclusion to the deepest non-enumeration rigth of reference.
      lastEnumerationReference.right = {
        left: lastEnumerationReference.right,
        position: {
          start: lastEnumerationReference.right.position.start,
          stop: otherReference.position.stop,
        },
        right: otherReference,
        type: "exclusion",
      }
      mergedReference = reference
    }
  } else if (
    reference.type !== "law" &&
    otherReference.type === "law" &&
    otherReference.child !== undefined
  ) {
    // Create a Merged reference of type law-reference based on otherReference.
    mergedReference = {
      ...otherReference,
      child:
        coordinator === "à"
          ? {
              first: reference,
              last: otherReference.child,
              position: {
                start: reference.position.start,
                stop: otherReference.position.stop,
              },
              type: "bounded-interval",
            }
          : {
              coordinator,
              left: reference,
              right: otherReference.child,
              position: {
                start: reference.position.start,
                stop: otherReference.position.stop,
              },
              type: "enumeration",
            },
    }
  } else {
    // TODO: Handle other combinations of reference.type & otherReference.type.
    mergedReference =
      coordinator === "à"
        ? {
            first: reference,
            last: otherReference,
            position: {
              start: reference.position.start,
              stop: otherReference.position.stop,
            },
            type: "bounded-interval",
          }
        : {
            coordinator,
            left: reference,
            position: {
              start: reference.position.start,
              stop: otherReference.position.stop,
            },
            right: otherReference,
            type: "enumeration",
          }
  }
  return createEnumerationOrBoundedInterval(
    mergedReference,
    remaining.slice(1),
    position,
  )
}

export function* iterAtomicReferences(
  reference: TextAstReference,
): Generator<TextAstAtomicReference, void> {
  switch (reference.type) {
    case "bounded-interval": {
      yield* iterAtomicReferences(reference.first)
      yield* iterAtomicReferences(reference.last)
      break
    }

    case "counted-interval": {
      yield* iterAtomicReferences(reference.first)
      break
    }

    case "enumeration":
    case "exclusion": {
      yield* iterAtomicReferences(reference.left)
      yield* iterAtomicReferences(reference.right)
      break
    }

    default: {
      yield reference
    }
  }
}
