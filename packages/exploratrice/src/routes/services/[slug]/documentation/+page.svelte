<script lang="ts">
	import {
		ApiDocumentationHeader,
		EmptyState,
		EndpointCard,
		EndpointCategorySection,
		ErrorDisplay,
		SchemaDocumentation,
		SearchBar,
	} from "$lib/components/openapi/index.js"
	import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
	import type { DataService } from "$lib/data/tricoteuses-ecosystem.js"
	import {
		categorizeEndpoints,
		deriveEndpoints,
		filterEndpoints,
		getBaseApiUrl,
	} from "$lib/openapi/helpers.js"

	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const service: DataService = data.service

	// State for UI interactions
	let selectedEndpoint = $state<string | null>(null)
	let selectedMethod = $state<string>("get")
	let searchQuery = $state("")

	function handleSelectEndpoint(path: string, method: string) {
		selectedEndpoint = path || null
		selectedMethod = method || "get"
	}

	// Configuration per service
	const serviceConfig = $derived.by(() => {
		switch (service.id) {
			case "api-canutes-assemblee":
				return {
					title: "Documentation API Canutes Assemblée",
					description:
						"API REST pour accéder aux données de l'Assemblée Nationale via PostgREST",
					endpointsWithDataField: [
						"/acteurs",
						"/amendements",
						"/dossiers",
						"/documents",
						"/organes",
						"/reunions",
						"/scrutins",
					],
					schemaMap: {
						acteurs: "Acteur",
						amendements: "Amendement",
						dossiers: "Dossier",
						documents: "Document",
						organes: "Organe",
						reunions: "Reunion",
						scrutins: "Scrutin",
					} as Record<string, string>,
					commonIdFieldName: undefined as string | undefined,
				}
			case "api-canutes-legifrance":
				return {
					title: "Documentation API Canutes Légifrance",
					description:
						"API REST pour accéder aux données législatives françaises via PostgREST",
					endpointsWithDataField: [
						"/article",
						"/texte_version",
						"/textelr",
						"/section_ta",
						"/dossier_legislatif",
						"/jo",
					],
					schemaMap: {
						article: ["JorfArticle", "LegiArticle"],
						texte_version: ["JorfTexteVersion", "LegiTexteVersion"],
						textelr: ["JorfTextelr", "LegiTextelr"],
						section_ta: ["JorfSectionTa", "LegiSectionTa"],
						dossier_legislatif: "DossierLegislatif",
						jo: "Jo",
					} as Record<string, string | string[]>,
					commonIdFieldName: "id",
				}
			case "api-parlement":
				return {
					title: "Documentation API Parlement",
					description:
						"API REST pour accéder aux données unifiées du Parlement français (Assemblée Nationale et Sénat)",
					endpointsWithDataField: [] as string[],
					schemaMap: {} as Record<string, string | string[]>,
					commonIdFieldName: undefined as string | undefined,
				}
			default:
				return {
					title: "Documentation API",
					description: "Documentation de l'API",
					endpointsWithDataField: [] as string[],
					schemaMap: {} as Record<string, string | string[]>,
					commonIdFieldName: undefined as string | undefined,
				}
		}
	})

	function getSchemaForEndpoint(path: string): any {
		const config = serviceConfig

		// Extract table/endpoint name from path
		const pathSegment = path.slice(1).replace(/^rpc\//, "")

		const schemaNames = config.schemaMap[pathSegment]
		if (!schemaNames || !data.jsonSchema?.definitions) return null

		// Handle multiple schemas (for Legifrance with Jorf/Legi variants)
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

	// Derive endpoints from OpenAPI spec
	const endpoints = $derived(deriveEndpoints(data.openApiSpec))
	const filteredEndpoints = $derived(filterEndpoints(endpoints, searchQuery))
	const categorizedEndpoints = $derived(
		categorizeEndpoints(filteredEndpoints, serviceConfig.endpointsWithDataField),
	)
	const BASE_API_URL = $derived(getBaseApiUrl(data.openApiSpec))
</script>

<svelte:head>
	<title>{serviceConfig.title} - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<PageBreadcrumb
		segments={[
			{ label: "Services", href: "/services" },
			{ label: service.name, href: `/services/${service.id}` },
			{ label: "Documentation" },
		]}
	/>

	<ApiDocumentationHeader
		title={serviceConfig.title}
		description={serviceConfig.description}
		openApiSpec={data.openApiSpec}
	/>

	<ErrorDisplay error={data.error} />

	{#if !data.error && data.openApiSpec}
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
					commonIdFieldName={serviceConfig.commonIdFieldName}
				/>
			{/snippet}

			<EndpointCategorySection
				title="Endpoints principaux"
				description="Ces endpoints retournent des données structurées dans un champ 'data' avec des schémas JSON détaillés."
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
