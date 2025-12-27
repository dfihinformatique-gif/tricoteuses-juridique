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

  // State management
  let selectedEndpoint = $state<string | null>(null)
  let selectedMethod = $state<string>("get")
  let searchQuery = $state("")

  function handleSelectEndpoint(path: string, method: string) {
    selectedEndpoint = path || null
    selectedMethod = method || "get"
  }

  function getSchemaForEndpoint(path: string): any {
    // Extract schema from OpenAPI spec response
    // All endpoints now have their schema defined in the OpenAPI spec
    if (data.openApiSpec?.paths?.[path]) {
      const pathItem = data.openApiSpec.paths[path]
      const getMethod = (pathItem as any)?.get
      if (getMethod?.responses?.["200"]?.schema) {
        const responseSchema = getMethod.responses["200"].schema
        // Check if response has a data field with a $ref
        if (responseSchema.properties?.data?.$ref) {
          const refPath = responseSchema.properties.data.$ref
          const schemaName = refPath.split("/").pop()
          if (schemaName && data.jsonSchema?.definitions?.[schemaName]) {
            const schema = data.jsonSchema.definitions[schemaName]
            // Add the schema name as title if not already present
            return {
              ...schema,
              title: schema.title || schemaName,
            }
          }
        }
      }
    }

    return null
  }

  // List of endpoints that have a data field in their response
  // All single-resource endpoints (those with {uid} or {id}) return { data: {...} }
  const endpointsWithDataField = [
    "/actesLegislatifs/{uid}",
    "/acteurs/{uid}",
    "/adressesElectroniques/{uid}",
    "/adressesPostales/{uid}",
    "/alineas/{id}",
    "/amendements/{uid}",
    "/collaborateurs/{uid}",
    "/communes/{id}",
    "/co_signataires_amendement/{id}",
    "/debats/{uid}",
    "/documents/{uid}",
    "/dossiers/{uid}",
    "/etapesLegislatives/{uid}",
    "/groupesVotants/{uid}",
    "/interventions/{id}",
    "/mandats/{uid}",
    "/metriques/{id}",
    "/organes/{uid}",
    "/participants_reunions/{id}",
    "/personnes_auditionnees_reunions/{id}",
    "/points_odj/{uid}",
    "/questions/{uid}",
    "/reunions/{uid}",
    "/scrutins/{uid}",
    "/stats/{id}",
    "/votes/{uid}",
  ]

  // Derive endpoints from OpenAPI spec using utility functions
  const endpoints = $derived(deriveEndpoints(data.openApiSpec))
  const filteredEndpoints = $derived(filterEndpoints(endpoints, searchQuery))
  const categorizedEndpoints = $derived(
    categorizeEndpoints(filteredEndpoints, endpointsWithDataField),
  )
  const BASE_API_URL = $derived(getBaseApiUrl(data.openApiSpec))
</script>

<svelte:head>
  <title>Documentation API Parlement</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <ApiDocumentationHeader
    title="Documentation API Parlement"
    description="API REST pour accéder aux données unifiées du Parlement français (Assemblée Nationale & Sénat)"
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
          commonIdFieldName="uid"
        />
      {/snippet}

      <EndpointCategorySection
        title="Endpoints principaux"
        description={`Ces endpoints retournent des données structurées dans un champ "data" avec des schémas JSON détaillés.`}
        endpoints={categorizedEndpoints.withDataField}
        colorClass="text-blue-600 dark:text-blue-400"
        {endpointCard}
      />

      <EndpointCategorySection
        title="Endpoints d'export"
        description="Endpoints pour exporter les données en différents formats (JSON, CSV, RSS)."
        endpoints={categorizedEndpoints.standard}
        colorClass="text-gray-700 dark:text-gray-300"
        {endpointCard}
      />

      <EndpointCategorySection
        title="Endpoint racine"
        description="Endpoint racine de l'API fournissant la description de cette API."
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

  <div
    class="mt-12 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800"
  >
    <h3 class="mb-3 text-lg font-semibold">À propos de l'API Parlement</h3>
    <p class="mb-3 text-gray-600 dark:text-gray-300">
      L'API Parlement fournit un accès unifié aux données du Parlement français
      (Assemblée Nationale et Sénat) via une interface REST moderne construite
      avec Express et Prisma.
    </p>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Accès libre et gratuit aux données parlementaires</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Documentation interactive avec schémas JSON détaillés</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Interface de test intégrée pour tous les endpoints</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>API REST conforme aux standards OpenAPI 3.0</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Données unifiées des deux chambres du Parlement</span>
      </li>
    </ul>
  </div>
</div>
