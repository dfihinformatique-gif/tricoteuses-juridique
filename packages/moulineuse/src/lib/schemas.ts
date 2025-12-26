/**
 * Load and cache JSON Schemas for Assemblée and Légifrance databases
 */

interface SchemaCache {
  assemblee: Record<string, any> | null
  legifrance: Record<string, any> | null
}

const schemaCache: SchemaCache = {
  assemblee: null,
  legifrance: null,
}

/**
 * Fetch JSON Schemas for Assemblée nationale database
 * These schemas describe the structure of JSON data inside the `data` fields
 */
export async function loadAssembleeSchemas(): Promise<Record<string, any>> {
  if (schemaCache.assemblee) {
    return schemaCache.assemblee
  }

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

  await Promise.all(
    schemaFiles.map(async (file) => {
      try {
        const response = await fetch(
          `https://git.tricoteuses.fr/logiciels/tricoteuses-assemblee/raw/branch/master/src/schemas/${file}`,
        )
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const schema = (await response.json()) as Record<string, any>
        // Merge all definitions into a single object
        if (schema.definitions) {
          Object.assign(schemas, schema.definitions)
        }
      } catch (error) {
        console.error(`Error loading schema ${file}:`, error)
      }
    }),
  )

  const result = {
    definitions: schemas,
  }

  schemaCache.assemblee = result
  return result
}

/**
 * Fetch JSON Schema for Légifrance database
 * This schema describes the structure of JSON data inside the `data` fields
 */
export async function loadLegifranceSchemas(): Promise<Record<string, any>> {
  if (schemaCache.legifrance) {
    return schemaCache.legifrance
  }

  try {
    const response = await fetch(
      "https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/raw/branch/main/static/schemas.json",
    )
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const schema = (await response.json()) as Record<string, any>
    schemaCache.legifrance = schema
    return schema
  } catch (error) {
    console.error("Error loading Légifrance schema:", error)
    throw error
  }
}

/**
 * Clear the schema cache (useful for testing or forcing a reload)
 */
export function clearSchemaCache(): void {
  schemaCache.assemblee = null
  schemaCache.legifrance = null
}
