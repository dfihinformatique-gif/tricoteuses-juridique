import type {
  CompoundReferencesSeparator,
  TextAstAtomicReference,
  TextAstCompoundReference,
  TextAstEnumeration,
  TextAstParentChild,
  TextAstReference,
  TextPosition,
} from "./ast.js"

const priorityByCoordinatorRecord: Record<CompoundReferencesSeparator, number> =
  {
    ",": 2,
    à: 3,
    et: 2,
    ou: 2,
    sauf: 1,
  }

export const addChildLeftToLastChild = (
  reference: TextAstReference,
  child: TextAstReference,
): TextAstParentChild =>
  reference.type === "parent-enfant"
    ? {
        ...reference,
        child: addChildLeftToLastChild(reference.child, child),
        position: {
          start: child.position.start,
          stop: reference.position.stop,
        },
      }
    : {
        child,
        parent: reference,
        position: {
          start: child.position.start,
          stop: reference.position.stop,
        },
        type: "parent-enfant",
      }

export const createEnumerationOrBoundedInterval = (
  reference: TextAstReference,
  remaining: Array<
    [CompoundReferencesSeparator, TextAstAtomicReference | TextAstParentChild]
  >,
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
  const [coordinator, nextReference] = remaining[0]
  const coordinatorPriority = priorityByCoordinatorRecord[coordinator]
  const nextCoordinator = remaining[1]?.[0]
  const nextCoordinatorPriority =
    nextCoordinator === undefined
      ? 0
      : priorityByCoordinatorRecord[nextCoordinator]
  const otherReference =
    coordinatorPriority < nextCoordinatorPriority
      ? createEnumerationOrBoundedInterval(nextReference, remaining.slice(1), {
          start: nextReference.position.start,
          stop: position.stop,
        })
      : nextReference
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
    otherReference.type === "parent-enfant" &&
    otherReference.parent.type === "law"
  ) {
    // Create a Merged reference of type law based on otherReference.
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
      position: {
        start: reference.position.start,
        stop: otherReference.position.stop,
      },
    }
  } else if (
    reference.type === "parent-enfant" &&
    reference.parent.type === "law" &&
    otherReference.type !== "law"
  ) {
    // Create a Merged reference of type law based on reference.
    mergedReference = {
      ...reference,
      child:
        coordinator === "à"
          ? {
              first: reference.child,
              last: otherReference,
              position: {
                start: reference.position.start,
                stop: otherReference.position.stop,
              },
              type: "bounded-interval",
            }
          : {
              coordinator,
              left: reference.child,
              right: otherReference,
              position: {
                start: reference.position.start,
                stop: otherReference.position.stop,
              },
              type: "enumeration",
            },
      position: {
        start: reference.position.start,
        stop: otherReference.position.stop,
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
  if (coordinatorPriority < nextCoordinatorPriority) {
    return mergedReference
  }
  return createEnumerationOrBoundedInterval(
    mergedReference,
    remaining.slice(1),
    position,
  )
}

export const createParentChildTreeFromReferences = (
  child: TextAstReference,
  ancestors: TextAstReference[],
  position: TextPosition,
): TextAstReference => {
  for (const parent of ancestors) {
    child = {
      child,
      parent,
      position: {
        start: child.position.start,
        stop: parent.position.stop,
      },
      type: "parent-enfant",
    }
  }
  child.position = position
  return child
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

    case "parent-enfant": {
      yield* iterAtomicReferences(reference.parent)
      yield* iterAtomicReferences(reference.child)
      break
    }

    default: {
      yield reference
    }
  }
}
