<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js"
	import * as Card from "$lib/components/ui/card/index.js"
	import type { Service } from "$lib/data/tricoteuses-ecosystem.js"
	import { Book, Building, Database, Folder, Terminal } from "@lucide/svelte"

	interface ServiceCardProps {
		class?: string
		service: Service
	}

	let { class: className, service }: ServiceCardProps = $props()

	const borderColorClass = $derived.by(() => {
		switch (service.type) {
			case "api":
				return "border-l-blue-500"
			case "git":
				return "border-l-amber-500"
			case "mcp":
				return "border-l-green-500"
			case "code":
				return "border-l-slate-500"
		}
	})

	const bgColorClass = $derived.by(() => {
		switch (service.type) {
			case "api":
				return "bg-blue-100 dark:bg-blue-900/30"
			case "git":
				return "bg-amber-100 dark:bg-amber-900/30"
			case "mcp":
				return "bg-green-100 dark:bg-green-900/30"
			case "code":
				return "bg-slate-100 dark:bg-slate-900/30"
		}
	})

	const iconColorClass = $derived.by(() => {
		switch (service.type) {
			case "api":
				return "text-blue-600 dark:text-blue-400"
			case "git":
				return "text-amber-600 dark:text-amber-400"
			case "mcp":
				return "text-green-600 dark:text-green-400"
			case "code":
				return "text-slate-600 dark:text-slate-400"
		}
	})

	const iconComponent = $derived.by(() => {
		switch (service.type) {
			case "api":
				return Building
			case "git":
				return Folder
			case "mcp":
				return Terminal
			case "code":
				return Book
		}
	})

	const typeBadgeLabel = $derived.by(() => {
		switch (service.type) {
			case "api":
				return "API REST"
			case "git":
				return "Dépôt Git"
			case "mcp":
				return "Serveur MCP"
			case "code":
				return "Code juridique"
		}
	})
</script>

<a
	href="/services/{service.id}"
	class="transition-transform hover:scale-[1.02] {className ?? ''}"
>
	<Card.Root class="h-full border-l-4 {borderColorClass}">
		<Card.Header>
			<div class="flex items-center gap-3">
				<div
					class="flex h-12 w-12 flex-none items-center justify-center rounded-lg {bgColorClass}"
				>
					<iconComponent class="h-6 w-6 {iconColorClass}"></iconComponent>
				</div>
				<Card.Title class="text-xl">{service.name}</Card.Title>
			</div>
			<Card.Description>
				{service.description}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex flex-wrap gap-2">
				<Badge variant="secondary">{typeBadgeLabel}</Badge>
				{#if service.author}
					<Badge variant="outline">{service.author}</Badge>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</a>
