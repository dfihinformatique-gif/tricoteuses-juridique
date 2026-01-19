/**
 * Standard Schema v1 adapter for Zod
 * See https://standardschema.dev/
 * Replaces auditors-based standardschema implementation
 */

import type { z } from "zod"

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

/**
 * Converts Zod issues to Standard Schema issues
 */
function zodIssueToStandardIssue(
  issue: z.ZodIssue
): StandardSchemaV1.Issue {
  return {
    message: issue.message,
    path: issue.path.length > 0 ? issue.path : undefined,
  }
}

/**
 * Creates a Standard Schema v1 wrapper around a Zod schema
 */
export function zodToStandardSchema<Output>(
  schema: z.ZodType<Output>
): StandardSchemaV1<Output> {
  return {
    "~standard": {
      validate(value: unknown): StandardSchemaV1.Result<Output> {
        const result = schema.safeParse(value)

        if (result.success) {
          return { value: result.data }
        } else {
          return {
            issues: result.error.issues.map(zodIssueToStandardIssue),
          }
        }
      },
      vendor: "zod",
      version: 1,
    },
  }
}
