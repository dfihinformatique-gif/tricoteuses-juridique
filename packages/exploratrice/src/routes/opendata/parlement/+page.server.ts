import type { OpenAPIV2, OpenAPIV3 } from "openapi-types"
import type { PageServerLoad } from "./$types"
import { convertOpenAPI3to2 } from "$lib/openapi/converters"
import { readFileSync } from "fs"
import { join } from "path"

export const load: PageServerLoad = async () => {
  try {
    // Load the OpenAPI 3.0 specification from the static file
    const filePath = join(process.cwd(), "static", "parlement_openapi.json")
    const fileContent = readFileSync(filePath, "utf-8")
    const openApiSpec3 = JSON.parse(fileContent) as OpenAPIV3.Document

    // Convert OpenAPI 3.0 to 2.0 for compatibility with existing components
    const openApiSpec = convertOpenAPI3to2(
      openApiSpec3,
      "https://parlement.tricoteuses.fr/",
    )

    // Extract JSON schemas from the OpenAPI 3.0 components
    // Format them to match the structure expected by the schema documentation component
    const jsonSchema = {
      definitions: openApiSpec3.components?.schemas || {},
    }

    return {
      openApiSpec,
      jsonSchema,
    }
  } catch (error) {
    console.error("Error loading API documentation:", error)
    return {
      openApiSpec: null,
      jsonSchema: null,
      error: "Failed to load API documentation",
    }
  }
}
