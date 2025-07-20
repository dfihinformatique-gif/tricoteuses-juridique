import {
  isTextAstAtomicReference,
  type CompoundReferencesSeparator,
  type TextAstAtomicReference,
  type TextAstCompoundReference,
  type TextAstEnumeration,
  type TextAstParentChild,
  type TextAstReference,
  type TextPosition,
} from "./ast.js"

const priorityByCoordinator: Record<CompoundReferencesSeparator, number> = {
  ",": 1,
  à: 3,
  et: 1,
  ou: 1,
  sauf: 2,
}

export const addChildLeftToLastChild = (
  reference: TextAstReference,
  child: TextAstReference,
): TextAstParentChild => {
  if (
    !isTextAstAtomicReference(reference) &&
    reference.type !== "parent-enfant"
  ) {
    throw new Error(`Can't add child to non-atomic parent: ${reference}`)
  }

  return reference.type === "parent-enfant"
    ? {
        ...reference,
        child: addChildLeftToLastChild(
          reference.child as TextAstAtomicReference | TextAstParentChild,
          child,
        ),
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
}

export const createEnumerationOrBoundedInterval = (
  reference: TextAstReference,
  remaining: Array<[CompoundReferencesSeparator, TextAstReference]>,
  position: TextPosition,
): TextAstReference => {
  // Parameter `remaining` is an array of the form
  // [[coordinator1, ref1], ...., [coordinatorN, refN]]
  // where `coordinators` are either "à", "et", "ou" & ",".
  while (remaining.length > 0) {
    reference = createEnumerationOrBoundedInterval1(
      reference,
      remaining,
      position,
      0,
    )
  }
  return {
    ...(reference as TextAstCompoundReference),
    position,
  }
}

export const createEnumerationOrBoundedInterval1 = (
  reference: TextAstReference,
  remaining: Array<[CompoundReferencesSeparator, TextAstReference]>,
  position: TextPosition,
  remainingIndex: number,
): TextAstReference => {
  // Parameter `remaining` is an array of the form
  // [[coordinator1, ref1], ...., [coordinatorN, refN]]
  // where `coordinators` are either "à", "et", "ou" & ",".
  if (remaining.length > remainingIndex) {
    // When there is no remaining, reference is always a compound reference.
    const [coordinator, otherReference] = remaining[remainingIndex]
    const coordinatorPriority = priorityByCoordinator[coordinator]
    const otherCoordinator = remaining[remainingIndex + 1]?.[0]
    const otherCoordinatorPriority =
      otherCoordinator === undefined
        ? 0
        : priorityByCoordinator[otherCoordinator]
    if (coordinatorPriority < otherCoordinatorPriority) {
      remaining[remainingIndex][1] = createEnumerationOrBoundedInterval1(
        otherReference,
        remaining,
        {
          start: otherReference.position.start,
          stop: position.stop,
        },
        remainingIndex + 1,
      )
    } else {
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
          reference = {
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
          // `reference` is not modified.
        }
      } else if (
        reference.type !== "texte" &&
        otherReference.type === "parent-enfant" &&
        otherReference.parent.type === "texte"
      ) {
        // Create a Merged reference of type law based on otherReference.
        reference = {
          ...otherReference,
          child:
            coordinator === "à"
              ? {
                  first: reference,
                  last: otherReference.child,
                  position: {
                    start: reference.position.start,
                    stop: otherReference.child.position.stop,
                  },
                  type: "bounded-interval",
                }
              : {
                  coordinator,
                  left: reference,
                  right: otherReference.child,
                  position: {
                    start: reference.position.start,
                    stop: otherReference.child.position.stop,
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
        reference.parent.type === "texte" &&
        otherReference.type !== "texte"
      ) {
        // Create a Merged reference of type law based on reference.
        reference = {
          ...reference,
          child:
            coordinator === "à"
              ? {
                  first: reference.child,
                  last: otherReference,
                  position: {
                    start: reference.child.position.start,
                    stop: otherReference.position.stop,
                  },
                  type: "bounded-interval",
                }
              : {
                  coordinator,
                  left: reference.child,
                  right: otherReference,
                  position: {
                    start: reference.child.position.start,
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
        reference =
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
      remaining.splice(remainingIndex, 1)
    }
  }
  return reference
}

export const createParentChildTreeFromReferences = (
  child: TextAstReference,
  ancestors: TextAstAtomicReference[],
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

export function* iterAtomicOrParentChildReferences(
  reference: TextAstReference,
): Generator<TextAstAtomicReference | TextAstParentChild, void> {
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

    case "reference_et_action": {
      yield* iterAtomicReferences(reference.reference)
      break
    }

    default: {
      yield reference
    }
  }
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

    case "reference_et_action": {
      yield* iterAtomicReferences(reference.reference)
      break
    }

    default: {
      yield reference
    }
  }
}
