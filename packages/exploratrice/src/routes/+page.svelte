<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js"
	import { ReuseCard, ServiceCard } from "$lib/components/tricoteuses/index.js"
	import {
		getFeaturedReuses,
		getFeaturedServices,
		getReusesByType,
	} from "$lib/data/tricoteuses-ecosystem.js"
	import { ChevronRight } from "@lucide/svelte"
	import { onDestroy, onMount } from "svelte"

	const featuredServices = getFeaturedServices()
	const featuredExternalReuses = getReusesByType("external").filter((r) => r.featured)
	const featuredDemos = getReusesByType("demo").filter((r) => r.featured)

	let intervalId: NodeJS.Timeout | undefined = $state(undefined)
	let tagline = $state("")
	let taglineIndex = 0
	const taglines = [
		"",
		", la loi sous git.",
		", la loi en liens.",
		", la loi en diffs.",
		", la loi et sa genèse.",
		", la loi en données publiques.",
		", la loi en logiciel libre.",
		", la loi en temps réel.",
	] as const

	onMount(() => {
		intervalId = setInterval(() => {
			taglineIndex++
			if (taglineIndex >= taglines.length) {
				taglineIndex = 0
			}
			tagline = taglines[taglineIndex]
		}, 3000)
	})

	onDestroy(() => {
		if (intervalId !== undefined) {
			clearInterval(intervalId)
		}
	})
</script>

<svelte:head>
	<title>Tricoteuses - Données publiques juridiques françaises</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Hero Section -->
	<header class="mb-16 text-center">
		<h1 class="mb-4 text-5xl font-bold">
			Tricoteuses<span class="italic text-primary">{tagline}</span>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-muted-foreground">
			Démocratiser l'accès aux données publiques juridiques françaises à travers des services
			ouverts, des APIs modernes et une communauté de contributeurs.
		</p>
	</header>

	<!-- Services Section -->
	<section class="mb-16">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h2 class="mb-2 text-3xl font-bold">Services et données</h2>
				<p class="text-muted-foreground">
					APIs, dépôts de données et services pour accéder aux données juridiques françaises
				</p>
			</div>
			<Button href="/services" variant="outline">
				Voir tous les services
				<ChevronRight class="ml-2 h-4 w-4" />
			</Button>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each featuredServices as service (service.id)}
				<ServiceCard {service} />
			{/each}
		</div>
	</section>

	<!-- Reuses Section -->
	<section class="mb-16">
		<div class="mb-8">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="mb-2 text-3xl font-bold">Réutilisations</h2>
					<p class="text-muted-foreground">
						Services et applications qui utilisent les données Tricoteuses
					</p>
				</div>
				<Button href="/reuses" variant="outline">
					Voir toutes les réutilisations
					<ChevronRight class="ml-2 h-4 w-4" />
				</Button>
			</div>

			<!-- External Reuses -->
			{#if featuredExternalReuses.length > 0}
				<h3 class="mb-4 text-xl font-semibold">Services externes</h3>
				<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each featuredExternalReuses as reuse (reuse.id)}
						<ReuseCard {reuse} />
					{/each}
				</div>
			{/if}

			<!-- Demos -->
			{#if featuredDemos.length > 0}
				<h3 class="mb-4 text-xl font-semibold">Démonstrations Tricoteuses</h3>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each featuredDemos as reuse (reuse.id)}
						<ReuseCard {reuse} />
					{/each}
				</div>
			{/if}
		</div>
	</section>

	<!-- CTA Section -->
	<section class="rounded-lg border bg-muted p-8 text-center">
		<h2 class="mb-4 text-2xl font-bold">Vous utilisez les données Tricoteuses ?</h2>
		<p class="mb-6 text-muted-foreground">
			Partagez votre projet avec la communauté et inspirez d'autres développeurs !
		</p>
		<Button href="/reuses/proposer" size="lg">
			Proposer une réutilisation
			<ChevronRight class="ml-2 h-4 w-4" />
		</Button>
	</section>
</div>
