/**
 * See https://standardschema.dev/
 */

import {
  iterAuditors,
  type Audit,
  type AuditSwitchError,
  type NestedAuditors,
} from "@auditors/core"

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly "~standard": StandardSchemaV1.Props<Input, Output>
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1
    /** The vendor name of the schema library. */
    readonly vendor: string
    /** Validates unknown input values. */
    readonly validate: (
      value: unknown,
    ) => Result<Output> | Promise<Result<Output>>
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output
    /** The non-existent issues. */
    readonly issues?: undefined
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input
    /** The output type of the schema. */
    readonly output: Output
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["input"]

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"]
}

function* iterIssuesFromAuditError(
  error: unknown,
  path: ReadonlyArray<PropertyKey> = [],
): Generator<StandardSchemaV1.Issue, void> {
  if (error != null) {
    if (typeof error === "object") {
      if ((error as AuditSwitchError)["@auditors/error"] === "switch") {
        // Use only best error of swith to generate issues.
        yield* iterIssuesFromAuditError(
          (error as AuditSwitchError).errors[(error as AuditSwitchError).index],
          path,
        )
      } else {
        // `error` is a standard object.
        for (const [key, itemError] of Object.entries(
          error as { [key: PropertyKey]: unknown },
        )) {
          yield* iterIssuesFromAuditError(itemError, [...path, key])
        }
      }
    } else {
      yield {
        message: error.toString(),
        path: path.length === 0 ? undefined : path,
      }
    }
  }
}

export const standardSchemaV1 = <Output>(
  audit: Audit,
  ...auditors: NestedAuditors[]
): StandardSchemaV1<Output> => ({
  "~standard": {
    validate(value: unknown): StandardSchemaV1.Result<Output> {
      let error = null
      for (const auditor of iterAuditors(auditors)) {
        ;[value, error] = auditor(audit, value)
        if (error !== null) {
          return { issues: [...iterIssuesFromAuditError(error)] }
        }
      }
      return { value: value as Output }
    },
    vendor: "auditors",
    version: 1,
  },
})
