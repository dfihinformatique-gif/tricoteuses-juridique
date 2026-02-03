/**
 * Public configuration schemas using Zod v4
 * These values are safe to expose to the client
 */

import { z } from "zod"

/**
 * Public application configuration schema
 * These values will be available on both client and server
 */
export const PublicConfigSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Application title is required")
      .default("Tricoteuses")
      .describe("Application title"),
  })
  .strict()

export type PublicConfig = z.infer<typeof PublicConfigSchema>

/**
 * Validates public configuration data
 * Throws ZodError if validation fails
 */
export function validatePublicConfig(data: unknown): PublicConfig {
  return PublicConfigSchema.parse(data)
}

/**
 * Validates public configuration data (safe version)
 * Returns { success: true, data } or { success: false, error }
 */
export function validatePublicConfigSafe(data: unknown) {
  return PublicConfigSchema.safeParse(data)
}
