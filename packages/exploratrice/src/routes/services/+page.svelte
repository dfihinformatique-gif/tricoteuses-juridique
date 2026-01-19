<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js"
	import { Button } from "$lib/components/ui/button/index.js"
	import { ServiceCard } from "$lib/components/tricoteuses/index.js"
	import {
		getServicesByType,
		services,
		type Service,
	} from "$lib/data/tricoteuses-ecosystem.js"
	import { Filter } from "@lucide/svelte"

	let selectedType = $state<Service["type"] | "all">("all")

	const filteredServices = $derived.by(() => {
		if (selectedType === "all") return services
		return getServicesByType(selectedType)
	})

	const filterButtons: Array<{ label: string; type: Service["type"] | "all" }> = [
		{ label: "Tous", type: "all" },
		{ label: "API REST", type: "api" },
		{ label: "Dépôts Git", type: "git" },
		{ label: "Serveurs MCP", type: "mcp" },
		{ label: "Codes juridiques", type: "code" },
	]
</script>

<svelte:head>
	<title>Services et données Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<header class="mb-12">
		<h1 class="mb-4 text-4xl font-bold">Services et données</h1>
		<p class="text-lg text-muted-foreground">
			Découvrez l'ensemble des services, données et APIs fournis par Tricoteuses pour
			démocratiser l'accès aux données publiques juridiques françaises.
		</p>
	</header>

	<!-- Filters -->
	<div class="mb-8 flex flex-wrap items-center gap-2">
		<div class="flex items-center gap-2 text-sm font-medium">
			<Filter class="h-4 w-4" />
			<span>Filtrer par type :</span>
		</div>
		{#each filterButtons as filter}
			<Button
				variant={selectedType === filter.type ? "default" : "outline"}
				size="sm"
				onclick={() => (selectedType = filter.type)}
			>
				{filter.label}
			</Button>
		{/each}
	</div>

	<!-- Results count -->
	<div class="mb-4 text-sm text-muted-foreground">
		{filteredServices.length}
		{filteredServices.length === 1 ? "service" : "services"}
		{selectedType !== "all" ? `(${filterButtons.find((f) => f.type === selectedType)?.label})` : ""}
	</div>

	<!-- Services grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredServices as service (service.id)}
			<ServiceCard {service} />
		{/each}
	</div>

	{#if filteredServices.length === 0}
		<div class="py-12 text-center">
			<p class="text-lg text-muted-foreground">Aucun service trouvé pour ce filtre.</p>
		</div>
	{/if}
</div>
