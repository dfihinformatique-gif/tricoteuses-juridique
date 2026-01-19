/**
 * Légifrance-specific validation schemas
 * Based on @tricoteuses/legifrance patterns
 */

import { z } from "zod"

/**
 * Validates a legal ID (Légifrance)
 * Format: 8 uppercase letters + 12 digits (total 20 characters)
 * Examples: LEGIARTI000006418367, JORFTEXT000000571356
 */
export function legalId(description?: string) {
  const baseSchema = z
    .string()
    .trim()
    .length(20, "Invalid length for legal ID")
    .regex(/^[A-Z]{8}\d{12}$/, "Invalid format for legal ID")

  return description ? baseSchema.describe(description) : baseSchema
}

/**
 * Optional legal ID
 */
export function legalIdOptional(description?: string) {
  return legalId(description).nullable().optional()
}
