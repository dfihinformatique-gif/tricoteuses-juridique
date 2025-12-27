import type { OpenAPIV2, OpenAPIV3 } from "openapi-types"

/**
 * Converts an OpenAPI 3.0 document to OpenAPI 2.0 (Swagger) format
 * for compatibility with existing components.
 *
 * @param spec - The OpenAPI 3.0 specification
 * @param baseUrl - The base URL of the API (e.g., "https://app.tricoteuses.fr/")
 * @returns An OpenAPI 2.0 (Swagger) specification
 */
export function convertOpenAPI3to2(
  spec: OpenAPIV3.Document,
  baseUrl: string,
): OpenAPIV2.Document {
  // Parse the base URL to extract host, basePath, and scheme
  let host = ""
  let basePath = "/"
  let schemes: ("http" | "https")[] = ["https"]

  try {
    const url = new URL(baseUrl)
    host = url.host
    basePath = url.pathname === "/" ? "" : url.pathname
    schemes = [url.protocol.replace(":", "") as "http" | "https"]
  } catch (error) {
    console.warn("Invalid baseUrl, using defaults", error)
  }

  // Handle parameters from either root level (OpenAPI 3.0 extended) or components
  const parameters = (spec as any).parameters || spec.components?.parameters || {}

  // Convert the specification
  const swagger: OpenAPIV2.Document = {
    swagger: "2.0",
    info: spec.info,
    host,
    basePath,
    schemes,
    paths: convertPaths(spec.paths || {}),
    definitions: ((spec as any).definitions || spec.components?.schemas || {}) as OpenAPIV2.DefinitionsObject,
    parameters: parameters as OpenAPIV2.ParametersDefinitionsObject,
  }

  // Add security definitions if present
  if (spec.components?.securitySchemes) {
    swagger.securityDefinitions = convertSecuritySchemes(
      spec.components.securitySchemes,
    )
  }

  return swagger
}

/**
 * Converts OpenAPI 3.0 paths to OpenAPI 2.0 format
 */
function convertPaths(
  paths: OpenAPIV3.PathsObject,
): OpenAPIV2.PathsObject {
  const converted: OpenAPIV2.PathsObject = {}

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue

    converted[path] = {} as OpenAPIV2.PathItemObject

    // Convert each HTTP method operation
    const methods = ["get", "post", "put", "delete", "patch", "head", "options"]
    for (const method of methods) {
      const operation = (pathItem as any)[method] as
        | OpenAPIV3.OperationObject
        | undefined
      if (operation) {
        ;(converted[path] as any)[method] = convertOperation(operation)
      }
    }

    // Copy parameters if present at path level
    if (pathItem.parameters) {
      ;(converted[path] as any).parameters = pathItem.parameters
    }
  }

  return converted
}

/**
 * Converts an OpenAPI 3.0 operation to OpenAPI 2.0 format
 */
function convertOperation(
  op: OpenAPIV3.OperationObject,
): OpenAPIV2.OperationObject {
  const converted: OpenAPIV2.OperationObject = {
    responses: convertResponses(op.responses),
  }

  // Copy simple properties
  if (op.tags) converted.tags = op.tags
  if (op.summary) converted.summary = op.summary
  if (op.description) converted.description = op.description
  if (op.operationId) converted.operationId = op.operationId
  if (op.deprecated) converted.deprecated = op.deprecated

  // Convert parameters
  if (op.parameters) {
    converted.parameters = op.parameters.map((param) => {
      // Handle reference or parameter object
      if ("$ref" in param) {
        return param as OpenAPIV2.ReferenceObject
      }
      return convertParameter(param as OpenAPIV3.ParameterObject)
    })
  }

  // Convert requestBody to parameters if present (OpenAPI 3.0 feature)
  if (op.requestBody && !("$ref" in op.requestBody)) {
    const requestBody = op.requestBody as OpenAPIV3.RequestBodyObject
    if (requestBody.content) {
      // Find first content type (usually application/json)
      const contentType = Object.keys(requestBody.content)[0]
      const mediaType = requestBody.content[contentType]

      if (mediaType?.schema) {
        const bodyParam: OpenAPIV2.InBodyParameterObject = {
          in: "body",
          name: "body",
          required: requestBody.required || false,
          schema: mediaType.schema as OpenAPIV2.SchemaObject,
        }
        if (requestBody.description) {
          bodyParam.description = requestBody.description
        }
        converted.parameters = converted.parameters || []
        converted.parameters.push(bodyParam)
      }
    }
  }

  // Convert produces from responses (simplified)
  const produces = extractProducesFromResponses(op.responses)
  if (produces.length > 0) {
    converted.produces = produces
  }

  return converted
}

/**
 * Converts OpenAPI 3.0 parameter to OpenAPI 2.0 format
 */
function convertParameter(
  param: OpenAPIV3.ParameterObject,
): OpenAPIV2.Parameter {
  const base: any = {
    name: param.name,
    in: param.in,
    description: param.description,
    required: param.required || false,
  }

  if (param.deprecated) base.deprecated = param.deprecated

  // Handle schema (OpenAPI 3.0) vs type (OpenAPI 2.0)
  if (param.schema) {
    const schema = param.schema as any
    if (schema.type) base.type = schema.type
    if (schema.format) base.format = schema.format
    if (schema.items) base.items = schema.items
    if (schema.default) base.default = schema.default
    if (schema.enum) base.enum = schema.enum
  }

  return base as OpenAPIV2.Parameter
}

/**
 * Converts OpenAPI 3.0 responses to OpenAPI 2.0 format
 */
function convertResponses(
  responses: OpenAPIV3.ResponsesObject,
): OpenAPIV2.ResponsesObject {
  const converted: OpenAPIV2.ResponsesObject = {}

  for (const [code, response] of Object.entries(responses)) {
    if ("$ref" in response) {
      converted[code] = response as OpenAPIV2.ReferenceObject
      continue
    }

    const responseObj = response as OpenAPIV3.ResponseObject
    const convertedResponse: OpenAPIV2.ResponseObject = {
      description: responseObj.description,
    }

    // Extract schema from first content type if present
    if (responseObj.content) {
      const contentType = Object.keys(responseObj.content)[0]
      const mediaType = responseObj.content[contentType]
      if (mediaType?.schema) {
        convertedResponse.schema = mediaType.schema as OpenAPIV2.SchemaObject
      }
    }

    // Convert headers
    if (responseObj.headers) {
      convertedResponse.headers = {}
      for (const [headerName, header] of Object.entries(responseObj.headers)) {
        if (!("$ref" in header)) {
          convertedResponse.headers[headerName] = {
            description: header.description,
            type: (header.schema as any)?.type || "string",
          } as OpenAPIV2.HeaderObject
        }
      }
    }

    converted[code] = convertedResponse
  }

  return converted
}

/**
 * Extracts produces (response content types) from responses
 */
function extractProducesFromResponses(
  responses: OpenAPIV3.ResponsesObject,
): string[] {
  const contentTypes = new Set<string>()

  for (const response of Object.values(responses)) {
    if ("content" in response && response.content) {
      Object.keys(response.content).forEach((ct) => contentTypes.add(ct))
    }
  }

  return Array.from(contentTypes)
}

/**
 * Converts OpenAPI 3.0 security schemes to OpenAPI 2.0 format
 */
function convertSecuritySchemes(
  schemes: Record<string, OpenAPIV3.SecuritySchemeObject | OpenAPIV3.ReferenceObject>,
): OpenAPIV2.SecurityDefinitionsObject {
  const converted: OpenAPIV2.SecurityDefinitionsObject = {}

  for (const [name, scheme] of Object.entries(schemes)) {
    if ("$ref" in scheme) continue

    const schemeObj = scheme as OpenAPIV3.SecuritySchemeObject

    if (schemeObj.type === "http") {
      if (schemeObj.scheme === "basic") {
        converted[name] = {
          type: "basic",
        } as OpenAPIV2.SecuritySchemeObject
      } else if (schemeObj.scheme === "bearer") {
        converted[name] = {
          type: "apiKey",
          in: "header",
          name: "Authorization",
        } as OpenAPIV2.SecuritySchemeObject
      }
    } else if (schemeObj.type === "apiKey") {
      converted[name] = {
        type: "apiKey",
        in: schemeObj.in,
        name: schemeObj.name,
      } as OpenAPIV2.SecuritySchemeObject
    } else if (schemeObj.type === "oauth2") {
      // Simplified OAuth2 conversion
      converted[name] = {
        type: "oauth2",
        flow: "implicit",
        authorizationUrl: "",
        scopes: {},
      } as OpenAPIV2.SecuritySchemeObject
    }
  }

  return converted
}
