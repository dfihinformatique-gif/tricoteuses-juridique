import type { OpenAPIV2 } from "openapi-types"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Fetch OpenAPI spec
    const openApiResponse = await fetch(
      "https://db.code4code.eu/canutes_assemblee/",
    )
    const openApiSpec = (await openApiResponse.json()) as OpenAPIV2.Document

    // Fetch JSON Schemas from multiple files in the schemas directory
    const schemaFiles = [
      "acteurs_et_organes.json",
      "agendas.json",
      "amendements.json",
      "debats.json",
      "dossiers_legislatifs.json",
      "legislatures.json",
      "questions.json",
      "scrutins.json",
    ]

    const schemas: Record<string, any> = {}

    // Fetch all schema files
    await Promise.all(
      schemaFiles.map(async (file) => {
        try {
          const response = await fetch(
            `https://git.tricoteuses.fr/logiciels/tricoteuses-assemblee/raw/branch/master/src/schemas/${file}`,
          )
          const schema = await response.json()
          // Merge all definitions into a single object
          if (schema.definitions) {
            Object.assign(schemas, schema.definitions)
          }
        } catch (error) {
          console.error(`Error loading schema ${file}:`, error)
        }
      }),
    )

    // Create a unified JSON Schema structure
    const jsonSchema = {
      definitions: schemas,
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
