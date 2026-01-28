/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * OpenAPI utilities and helpers for documentation pages
 */

import type { OpenAPIV2 } from "openapi-types"

// Types
export interface Endpoint {
  path: string
  methods: Array<{
    method: string
    details: OpenAPIV2.OperationObject
  }>
}

export interface CategorizedEndpoints {
  withDataField: Endpoint[]
  standard: Endpoint[]
  rpc: Endpoint[]
  root: Endpoint[]
}

/**
 * Get the color class for an HTTP method badge
 */
export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    get: "bg-blue-500",
    post: "bg-green-500",
    patch: "bg-yellow-500",
    delete: "bg-red-500",
    put: "bg-purple-500",
    head: "bg-gray-500",
  }
  return colors[method.toLowerCase()] || "bg-gray-500"
}

/**
 * Extract the schema name from a JSON Schema $ref
 */
export function extractRefName(ref: string): string {
  return ref.split("/").pop() || ""
}

/**
 * Get a human-readable type display for a schema
 */
export function getTypeDisplay(
  schema: OpenAPIV2.SchemaObject | OpenAPIV2.ReferenceObject,
): string {
  if ("$ref" in schema && schema.$ref) {
    return extractRefName(schema.$ref)
  }
  if ("type" in schema && schema.type === "array" && schema.items) {
    if ("$ref" in schema.items && schema.items.$ref) {
      return `${extractRefName(schema.items.$ref)}[]`
    }
    if ("type" in schema.items) {
      return `${schema.items.type || "any"}[]`
    }
    return "any[]"
  }
  if ("enum" in schema && schema.enum) {
    return "enum"
  }
  if ("type" in schema) {
    return Array.isArray(schema.type)
      ? schema.type[0] || "any"
      : schema.type || "any"
  }
  return "any"
}

/**
 * Resolve a $ref in an OpenAPI spec
 */
export function resolveRef(ref: string, spec: OpenAPIV2.Document): any {
  const parts = ref.split("/")
  let current: any = spec
  for (const part of parts) {
    if (part === "#") continue
    current = current?.[part]
  }
  return current
}

/**
 * Resolve parameters that may contain $ref
 */
export function resolveParameters(
  parameters:
    | Array<OpenAPIV2.ParameterObject | OpenAPIV2.ReferenceObject>
    | undefined,
  spec: OpenAPIV2.Document,
): OpenAPIV2.ParameterObject[] {
  if (!parameters) return []
  return parameters.map((param) => {
    if ("$ref" in param && param.$ref) {
      return resolveRef(param.$ref, spec)
    }
    return param as OpenAPIV2.ParameterObject
  })
}

/**
 * Build a URL with query parameters
 */
export function buildUrl(
  basePath: string,
  parameters: Record<string, string>,
): string {
  const queryParams = Object.entries(parameters)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&")

  return queryParams ? `${basePath}?${queryParams}` : basePath
}

/**
 * Get base API URL from OpenAPI spec
 */
export function getBaseApiUrl(openApiSpec: OpenAPIV2.Document | null): string {
  if (!openApiSpec) return ""
  return `${openApiSpec.schemes?.[0] || "https"}://${openApiSpec.host}${openApiSpec.basePath || ""}`
}

/**
 * Extract and derive endpoints from OpenAPI spec
 * Filters by allowed HTTP methods based on endpoint type
 */
export function deriveEndpoints(
  openApiSpec: OpenAPIV2.Document | null,
): Endpoint[] {
  if (!openApiSpec?.paths) return []

  return (
    Object.entries(openApiSpec.paths)
      // Filter out non-path entries (only keep entries starting with /)
      .filter(([path]) => path.startsWith("/"))
      .map(([path, pathItem]) => {
        // For RPC endpoints, allow multiple methods
        // For regular endpoints, only GET and HEAD (read-only database)
        const isRpc = path.startsWith("/rpc/")
        const allowedMethods = isRpc
          ? ["get", "post", "put", "delete", "patch", "head"]
          : ["get", "head"]

        const methods = Object.entries(pathItem || {})
          .filter(([method]) => allowedMethods.includes(method.toLowerCase()))
          .map(([method, details]) => ({
            method,
            details: details as OpenAPIV2.OperationObject,
          }))

        return {
          path,
          methods,
        }
      })
  )
}

/**
 * Filter endpoints based on search query
 */
export function filterEndpoints(
  endpoints: Endpoint[],
  searchQuery: string,
): Endpoint[] {
  if (!searchQuery) return endpoints

  return endpoints.filter((endpoint) =>
    endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()),
  )
}

/**
 * Categorize endpoints into four groups
 */
export function categorizeEndpoints(
  endpoints: Endpoint[],
  endpointsWithDataField: string[],
): CategorizedEndpoints {
  const withDataField: Endpoint[] = []
  const standard: Endpoint[] = []
  const rpc: Endpoint[] = []
  const root: Endpoint[] = []

  endpoints.forEach((endpoint) => {
    if (endpoint.path === "/") {
      root.push(endpoint)
    } else if (endpoint.path.startsWith("/rpc/")) {
      rpc.push(endpoint)
    } else if (endpointsWithDataField.includes(endpoint.path)) {
      withDataField.push(endpoint)
    } else {
      standard.push(endpoint)
    }
  })

  // Sort each category alphabetically by path
  const sorter = (a: Endpoint, b: Endpoint) => a.path.localeCompare(b.path)
  withDataField.sort(sorter)
  standard.sort(sorter)
  rpc.sort(sorter)

  return { withDataField, standard, rpc, root }
}
