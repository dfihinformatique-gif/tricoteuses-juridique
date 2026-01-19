<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js"
	import { Button } from "$lib/components/ui/button/index.js"
	import * as Card from "$lib/components/ui/card/index.js"
	import { PageBreadcrumb, ReuseCard } from "$lib/components/tricoteuses/index.js"
	import { getReusesByServiceId, type Service } from "$lib/data/tricoteuses-ecosystem.js"
	import {
		BookIcon,
		BuildingIcon,
		ExternalLinkIcon,
		FolderIcon,
		TerminalIcon,
	} from "@lucide/svelte"

	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const service: Service = data.service
	const reuses = getReusesByServiceId(service.id)

	const serviceIcon = $derived.by(() => {
		switch (service.type) {
			case "api":
				return BuildingIcon
			case "git":
				return FolderIcon
			case "mcp":
				return TerminalIcon
			case "code":
				return BookIcon
		}
	})

	function getServiceColor(type: Service["type"]) {
		switch (type) {
			case "api":
				return "border-l-blue-500"
			case "git":
				return "border-l-amber-500"
			case "mcp":
				return "border-l-green-500"
			case "code":
				return "border-l-slate-500"
			default:
				return "border-l-gray-500"
		}
	}

	function getTypeBadgeColor(type: Service["type"]) {
		switch (type) {
			case "api":
				return "bg-blue-500 hover:bg-blue-600"
			case "git":
				return "bg-amber-500 hover:bg-amber-600"
			case "mcp":
				return "bg-green-500 hover:bg-green-600"
			case "code":
				return "bg-slate-500 hover:bg-slate-600"
			default:
				return "bg-gray-500 hover:bg-gray-600"
		}
	}

	function getTypeLabel(type: Service["type"]) {
		switch (type) {
			case "api":
				return "API REST"
			case "git":
				return "Dépôt Git"
			case "mcp":
				return "Serveur MCP"
			case "code":
				return "Code juridique"
			default:
				return type
		}
	}
</script>

<svelte:head>
	<title>{service.name} - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<PageBreadcrumb
		segments={[{ label: "Services", href: "/services" }, { label: service.name }]}
	/>

	<!-- Service details -->
		<Card.Root class="mb-8 border-l-4 {getServiceColor(service.type)}">
			<Card.Content class="py-6">
				<!-- Header with icon, title and badge -->
				<div class="mb-4 flex items-start justify-between">
					<div class="flex items-start gap-4">
						<div class="rounded-lg bg-muted p-3">
							<serviceIcon size={32}></serviceIcon>
						</div>
						<div>
							<h1 class="mb-2 text-4xl font-bold">{service.name}</h1>
							<div class="flex flex-wrap items-center gap-2">
								<Badge class={getTypeBadgeColor(service.type)}>
									{getTypeLabel(service.type)}
								</Badge>
								{#if service.author !== undefined}
									<Badge variant="outline">
										{service.author}
									</Badge>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Description -->
				<p class="mb-6 text-lg text-muted-foreground">
					{service.description}
				</p>

				<!-- Provider -->
				{#if service.provider !== undefined}
					<p class="mb-6 text-sm text-muted-foreground">
						Ce service vous est proposé gracieusement par <a
							href={service.provider.url}
							target="_blank"
							rel="noopener noreferrer"
							class="font-semibold underline hover:text-foreground"
						>
							{service.provider.name}
						</a>, dans le cadre de l'engagement des Tricoteuses pour l'ouverture et l'accessibilité
						des données publiques juridiques françaises.
					</p>
				{/if}

				<!-- Links -->
				<div class="flex flex-wrap gap-3">
					{#if service.url !== undefined}
						<Button href={service.url} target="_blank" rel="noopener noreferrer">
							<ExternalLinkIcon class="mr-2 h-4 w-4" />
							Accéder au service
						</Button>
					{/if}
					{#if service.technicalDocUrl !== undefined}
						<Button
							href={service.technicalDocUrl}
							variant="outline"
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLinkIcon class="mr-2 h-4 w-4" />
							Documentation technique
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Used by section -->
		{#if reuses.length > 0}
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-bold">Utilisé par</h2>
				<p class="mb-6 text-muted-foreground">
					Ce service est utilisé par {reuses.length} réutilisation{reuses.length > 1
						? "s"
						: ""}.
				</p>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each reuses as reuse (reuse.id)}
						<ReuseCard {reuse} />
					{/each}
				</div>
			</section>
		{/if}

		<!-- Technical details section (for APIs) -->
		{#if service.type === "api"}
			<Card.Root>
				<Card.Content class="py-6">
					<h2 class="mb-4 text-2xl font-bold">Documentation technique</h2>
					<p class="mb-4 text-muted-foreground">
						Cette API fournit un accès REST aux données. Pour plus de détails sur les
						endpoints disponibles, consultez la documentation technique.
					</p>
					{#if service.technicalDocUrl !== undefined}
						<Button
							href={service.technicalDocUrl}
							variant="outline"
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLinkIcon class="mr-2 h-4 w-4" />
							Voir la documentation complète
						</Button>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
</div>
