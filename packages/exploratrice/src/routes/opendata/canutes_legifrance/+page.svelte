<script lang="ts">
  import type { PageData } from "./$types"
  import {
    ApiDocumentationHeader,
    SchemaDocumentation,
    SearchBar,
    ErrorDisplay,
    EmptyState,
    EndpointCategorySection,
    EndpointCard,
  } from "$lib/components/openapi"
  import {
    deriveEndpoints,
    filterEndpoints,
    categorizeEndpoints,
    getBaseApiUrl,
  } from "$lib/openapi/helpers"

  let { data }: { data: PageData } = $props()

  // State for UI interactions
  let selectedEndpoint = $state<string | null>(null)
  let selectedMethod = $state<string>("get")
  let searchQuery = $state("")

  function handleSelectEndpoint(path: string, method: string) {
    selectedEndpoint = path || null
    selectedMethod = method || "get"
  }

  // List of endpoints that have a data field in their response
  const endpointsWithDataField = [
    "/article",
    "/texte_version",
    "/textelr",
    "/section_ta",
    "/dossier_legislatif",
    "/jo",
  ]

  // Derive endpoints from OpenAPI spec using utility functions
  const endpoints = $derived(deriveEndpoints(data.openApiSpec))
  const filteredEndpoints = $derived(filterEndpoints(endpoints, searchQuery))
  const categorizedEndpoints = $derived(
    categorizeEndpoints(filteredEndpoints, endpointsWithDataField),
  )

  function getSchemaForEndpoint(path: string): any {
    // Extract table name from path (e.g., /article -> article)
    const tableName = path.replace("/", "").replace(/^rpc\//, "")

    // Map table names to JSON Schema definitions
    // Some endpoints can return multiple schema types (both Jorf and Legi formats)
    const schemaMap: Record<string, string | string[]> = {
      article: ["JorfArticle", "LegiArticle"],
      texte_version: ["JorfTexteVersion", "LegiTexteVersion"],
      textelr: ["JorfTextelr", "LegiTextelr"],
      section_ta: ["JorfSectionTa", "LegiSectionTa"],
      dossier_legislatif: "DossierLegislatif",
      jo: "Jo",
    }

    const schemaNames = schemaMap[tableName]
    if (!schemaNames || !data.jsonSchema?.definitions) return null

    // Handle multiple schemas
    if (Array.isArray(schemaNames)) {
      return {
        oneOf: schemaNames
          .map((name) => data.jsonSchema?.definitions?.[name])
          .filter((schema) => schema != null),
      }
    }

    // Single schema
    return data.jsonSchema.definitions[schemaNames]
  }

  const BASE_API_URL = $derived(getBaseApiUrl(data.openApiSpec))
</script>

<svelte:head>
  <title>Documentation API Canutes Legifrance</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <ApiDocumentationHeader
    title="Documentation API Canutes Legifrance"
    description="API REST pour accéder aux données législatives françaises via PostgREST"
    openApiSpec={data.openApiSpec}
  />

  <ErrorDisplay error={data.error} />

  {#if !data.error}
    <SearchBar bind:value={searchQuery} />

    <!-- Endpoints list -->
    <div class="space-y-8">
      {#snippet endpointCard(endpoint: (typeof endpoints)[0])}
        <EndpointCard
          {endpoint}
          {selectedEndpoint}
          {selectedMethod}
          openApiSpec={data.openApiSpec}
          baseUrl={BASE_API_URL}
          {getSchemaForEndpoint}
          onSelectEndpoint={handleSelectEndpoint}
          commonIdFieldName="id"
        />
      {/snippet}

      <EndpointCategorySection
        title="Endpoints principaux"
        description="Ces endpoints retournent des données structurées dans un champ "data" avec des schémas JSON détaillés."
        endpoints={categorizedEndpoints.withDataField}
        colorClass="text-blue-600 dark:text-blue-400"
        {endpointCard}
      />

      <EndpointCategorySection
        title="Autres endpoints"
        description="Endpoints standards de l'API PostgREST pour les opérations de base."
        endpoints={categorizedEndpoints.standard}
        colorClass="text-gray-700 dark:text-gray-300"
        {endpointCard}
      />

      <EndpointCategorySection
        title="Endpoints techniques"
        description="Endpoints RPC (Remote Procedure Call) pour les opérations techniques et avancées."
        endpoints={categorizedEndpoints.rpc}
        colorClass="text-orange-600 dark:text-orange-400"
        {endpointCard}
      />

      <EndpointCategorySection
        title="Endpoint racine"
        description="Endpoint racine de l'API fournissant la description de cette API au format OpenAPI."
        endpoints={categorizedEndpoints.root}
        colorClass="text-gray-600 dark:text-gray-400"
        {endpointCard}
      />
    </div>

    {#if filteredEndpoints.length === 0}
      <EmptyState {searchQuery} />
    {/if}

    <!-- JSON Schema Documentation Section -->
    {#if data.jsonSchema?.definitions}
      <SchemaDocumentation definitions={data.jsonSchema.definitions} />
    {/if}
  {/if}
</div>
