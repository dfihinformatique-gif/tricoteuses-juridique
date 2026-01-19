/**
 * URL query parameter parsing with Zod v4
 * Replaces auditors from src/lib/auditors/queries.ts
 */

import { z } from "zod"

/**
 * Parses URLSearchParams into a Record<string, string[]>
 */
export function parseSearchParams(
  params: URLSearchParams
): Record<string, string[]> {
  const data: Record<string, string[]> = {}

  for (const [key, value] of params.entries()) {
    if (!data[key]) {
      data[key] = []
    }
    data[key].push(value)
  }

  return data
}

/**
 * Query singleton schema - ensures parameter appears at most once
 * Returns first value or undefined
 */
export function querySingleton<T extends z.ZodTypeAny>(schema: T) {
  return z
    .array(z.string())
    .max(1, "Parameter must be present only once in query")
    .transform((arr) => (arr.length > 0 ? schema.parse(arr[0]) : undefined))
}

/**
 * Query array schema - allows multiple values
 * Returns empty array if not present
 */
export function queryArray<T extends z.ZodTypeAny>(schema: T) {
  return z
    .array(z.string())
    .transform((arr) => arr.map((val) => schema.parse(val)))
    .default([])
}

/**
 * Special query handler for 'q' parameter
 * Returns empty string if present but empty, undefined if not present
 */
export function queryQ() {
  return z
    .array(z.string())
    .max(1, "Parameter must be present only once in query")
    .transform((arr) => arr[0] ?? undefined)
    .optional()
}
