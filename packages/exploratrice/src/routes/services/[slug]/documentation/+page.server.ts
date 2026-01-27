import { error } from "@sveltejs/kit"
import { readFileSync } from "fs"
import { join } from "path"
import type { OpenAPIV2, OpenAPIV3 } from "openapi-types"

import { dataServices } from "$lib/data/tricoteuses-ecosystem.js"
import { convertOpenAPI3to2 } from "$lib/openapi/converters.js"

import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, fetch }) => {
  const service = dataServices[params.slug]

  if (service === undefined) {
    throw error(404, {
      message: `Le service "${params.slug}" n'existe pas`,
    })
  }

  // Only API services have documentation
  if (service.type !== "api") {
    throw error(404, {
      message: `Le service "${params.slug}" n'a pas de documentation API`,
    })
  }

  try {
    let openApiSpec: OpenAPIV2.Document
    let jsonSchema: { definitions: Record<string, unknown> } | null = null

    // Load OpenAPI spec and JSON schemas based on service
    switch (service.id) {
      case "api-canutes-assemblee": {
        // Fetch OpenAPI spec
        const openApiResponse = await fetch(
          "https://db.code4code.eu/canutes_assemblee/",
        )
        openApiSpec = (await openApiResponse.json()) as OpenAPIV2.Document

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

        const schemas: Record<string, unknown> = {}

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
        jsonSchema = {
          definitions: schemas,
        }
        break
      }

      case "api-canutes-legifrance": {
        // Fetch OpenAPI spec
        const openApiResponse = await fetch(
          "https://db.code4code.eu/canutes_legifrance/",
        )
        openApiSpec = (await openApiResponse.json()) as OpenAPIV2.Document

        // Fetch JSON Schema
        const schemaResponse = await fetch(
          "https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/raw/branch/main/static/schemas.json",
        )
        jsonSchema = await schemaResponse.json()
        break
      }

      case "api-parlement": {
        // Load the OpenAPI 3.0 specification from the static file
        const filePath = join(process.cwd(), "static", "parlement_openapi.json")
        const fileContent = readFileSync(filePath, "utf-8")
        const openApiSpec3 = JSON.parse(fileContent) as OpenAPIV3.Document

        // Convert OpenAPI 3.0 to 2.0 for compatibility with existing components
        openApiSpec = convertOpenAPI3to2(
          openApiSpec3,
          "https://parlement.tricoteuses.fr/",
        )

        // Extract JSON schemas from the OpenAPI 3.0 components
        jsonSchema = {
          definitions: openApiSpec3.components?.schemas || {},
        }
        break
      }

      default:
        throw error(404, {
          message: `Aucune documentation disponible pour le service "${params.slug}"`,
        })
    }

    return {
      service,
      openApiSpec,
      jsonSchema,
    }
  } catch (err) {
    console.error("Error loading API documentation:", err)
    return {
      service,
      openApiSpec: null,
      jsonSchema: null,
      error: "Failed to load API documentation",
    }
  }
}
