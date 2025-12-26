import type { OpenAPIV2 } from "openapi-types"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Fetch OpenAPI spec
    const openApiResponse = await fetch(
      "https://db.code4code.eu/canutes_legifrance/",
    )
    const openApiSpec = (await openApiResponse.json()) as OpenAPIV2.Document

    // Fetch JSON Schema
    const schemaResponse = await fetch(
      "https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/raw/branch/main/static/schemas.json",
    )
    const jsonSchema = await schemaResponse.json()

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
