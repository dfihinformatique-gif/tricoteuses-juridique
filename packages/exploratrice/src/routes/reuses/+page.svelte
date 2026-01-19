<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
	import ReuseCard from "$lib/components/reuse-card.svelte"
	import {
		getReusesByType,
		reuses,
		type Reuse,
	} from "$lib/data/tricoteuses-ecosystem.js"
	import { Filter, Plus } from "@lucide/svelte"

	let selectedType = $state<Reuse["type"] | "all">("all")

	const filteredReuses = $derived.by(() => {
		if (selectedType === "all") return reuses
		return getReusesByType(selectedType)
	})

	const filterButtons: Array<{ label: string; type: Reuse["type"] | "all" }> = [
		{ label: "Toutes", type: "all" },
		{ label: "Réutilisations externes", type: "external" },
		{ label: "Démonstrations", type: "demo" },
	]
</script>

<svelte:head>
	<title>Réutilisations Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<PageBreadcrumb segments={[{ label: "Réutilisations" }]} />

	<!-- Header -->
	<header class="mb-12">
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<h1 class="mb-4 text-4xl font-bold">Réutilisations</h1>
				<p class="text-lg text-muted-foreground">
					Découvrez les services et applications qui utilisent les données Tricoteuses, ainsi que nos
					démonstrations de ce qu'il est possible de construire.
				</p>
			</div>
			<Button href="/reuses/proposer" class="flex-none">
				<Plus class="mr-2 h-4 w-4" />
				Proposer une réutilisation
			</Button>
		</div>
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
		{filteredReuses.length}
		{filteredReuses.length === 1 ? "réutilisation" : "réutilisations"}
		{selectedType !== "all" ? `(${filterButtons.find((f) => f.type === selectedType)?.label})` : ""}
	</div>

	<!-- Reuses grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredReuses as reuse (reuse.id)}
			<ReuseCard {reuse} />
		{/each}
	</div>

	{#if filteredReuses.length === 0}
		<div class="py-12 text-center">
			<p class="text-lg text-muted-foreground">Aucune réutilisation trouvée pour ce filtre.</p>
		</div>
	{/if}
</div>
