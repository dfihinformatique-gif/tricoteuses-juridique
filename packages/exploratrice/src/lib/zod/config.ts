/**
 * Configuration schemas using Zod v4
 * Replaces auditors from src/lib/server/auditors/config.ts
 */

import { z } from "zod"
import { httpUrl, stringToBoolean } from "./helpers.js"

/**
 * Database configuration schema
 * All fields are required and non-empty
 */
export const DatabaseConfigSchema = z
  .object({
    host: z.string().trim().min(1, "Database host is required"),
    port: z.coerce
      .number()
      .int()
      .min(0)
      .max(65536, "Port must be between 0 and 65536"),
    database: z.string().trim().min(1, "Database name is required"),
    user: z.string().trim().min(1, "Database user is required"),
    password: z.string().trim().min(1, "Database password is required"),
  })
  .strict()

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>

/**
 * Main application configuration schema
 */
export const ConfigSchema = z
  .object({
    allowRobots: z
      .union([stringToBoolean(), z.boolean()])
      .default(false)
      .describe("Whether to allow search engine robots"),

    assembleeDb: DatabaseConfigSchema.describe(
      "Database configuration for Assemblée data",
    ),

    assembleeDocumentsDir: z
      .string()
      .trim()
      .min(1, "Assemblée documents directory is required")
      .describe("Path to Assemblée documents directory"),

    gristApiKey: z
      .string()
      .trim()
      .min(1, "Grist API key is required")
      .describe("API key for Grist"),

    gristDocId: z
      .string()
      .trim()
      .min(1, "Grist document ID is required")
      .describe("Grist document ID"),

    gristInstanceUrl: httpUrl().describe("Grist instance URL"),

    legiDb: DatabaseConfigSchema.describe(
      "Database configuration for Légifrance data",
    ),

    linkUrlOriginReplacement: httpUrl()
      .optional()
      .transform((url) => url?.replace(/\/$/, ""))
      .describe("Optional URL origin replacement for links"),

    tisseuseDb: DatabaseConfigSchema.describe(
      "Database configuration for Tisseuse data",
    ),

    title: z
      .string()
      .trim()
      .min(1, "Application title is required")
      .describe("Application title"),
  })
  .strict()

export type Config = z.infer<typeof ConfigSchema>

/**
 * Validates configuration data
 * Throws ZodError if validation fails
 */
export function validateConfig(data: unknown): Config {
  return ConfigSchema.parse(data)
}

/**
 * Validates configuration data (safe version)
 * Returns { success: true, data } or { success: false, error }
 */
export function validateConfigSafe(data: unknown) {
  return ConfigSchema.safeParse(data)
}
