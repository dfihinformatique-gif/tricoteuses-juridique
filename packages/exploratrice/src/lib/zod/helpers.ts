/**
 * Helper functions and custom Zod schemas
 * Based on tricoteuses-legifrance migration patterns
 */

import { z } from "zod"

/**
 * Trims a string and transforms empty strings to undefined
 * Compatible with PostgreSQL JSONB (no explicit nulls)
 */
export function trimmedString() {
  return z.coerce
    .string()
    .trim()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().optional())
}

/**
 * Validates ISO 8601 date strings (with or without time)
 */
export function dateIso8601() {
  return z
    .string()
    .trim()
    .refine(
      (val) => {
        // Check if it's a valid ISO 8601 date or datetime
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
        return dateRegex.test(val) || datetimeRegex.test(val)
      },
      { message: "Invalid ISO 8601 date format" }
    )
}

/**
 * Validates HTTP/HTTPS URLs
 */
export function httpUrl() {
  return z.string().url()
}

/**
 * Coerces string to boolean
 * Accepts: "true", "false", "1", "0", "yes", "no"
 */
export function stringToBoolean() {
  return z.coerce.string().transform((val) => {
    const normalized = val.toLowerCase().trim()
    return ["true", "1", "yes"].includes(normalized)
  })
}

/**
 * Ensures a value is always an array
 * Transforms single values to arrays
 */
export function ensureArray<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.array(schema)]).transform((val) =>
    Array.isArray(val) ? val : [val]
  )
}

