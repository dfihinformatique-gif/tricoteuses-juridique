<script lang="ts">
	import { z } from "zod"
	import { SearchIcon } from "@lucide/svelte"
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"

	import { goto } from "$app/navigation"
	import { page } from "$app/state"
	import { parseSearchParams, querySingleton, queryQ } from "$lib/zod/query.js"
	import {
		possibleTypes,
		type PossibleType,
		type Suggestion,
	} from "$lib/autocompletion.js"
	import { Badge } from "$lib/components/ui/badge/index.js"
	import * as Card from "$lib/components/ui/card/index.js"
	import * as Command from "$lib/components/ui/command/index.js"
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
	import * as InputGroup from "$lib/components/ui/input-group/index.js"
	import { PageBreadcrumb } from "$lib/components/tricoteuses/index.js"
	import { fullDateFormatter } from "$lib/dates.js"
	import { searchContext } from "$lib/hooks/search-context.svelte.js"
	import { autocomplete } from "$lib/autocompletion.remote.js"
	import { urlPathFromId } from "$lib/urls.js"

	// Define the query schema for search parameters
	const SearchQuerySchema = z.object({
		q: queryQ(),
		type: querySingleton(
			z
				.string()
				.trim()
				.transform((val) => (val === "" ? undefined : val))
				.pipe(z.enum(possibleTypes).optional())
		),
	})

	type SearchQuery = z.infer<typeof SearchQuerySchema>

	const parseQuery = (query: URLSearchParams): SearchQuery => {
		const data = parseSearchParams(query)
		const result = SearchQuerySchema.safeParse(data)

		if (result.success) {
			return result.data
		}

		// Return default values on parse error
		return { q: undefined, type: undefined }
	}

	let { q, type: typeFilter } = $state(parseQuery(page.url.searchParams))

	const sampleSearches = [
		"loi informatique et libertés",
		"article 204 A du code général des impôts",
		"JORF du 5 octobre 1958",
		"projet de loi de finances pour 2026",
		"JORFTEXT000000571356",
	]

	let suggestions = $derived(
		await autocomplete([
			q,
			typeFilter ?? null,
			searchContext.legifranceTexteCid,
		])
	)

	const updateUrlSearchParams = (): void => {
		const params = [
			["q", q],
			["type", typeFilter],
		].filter(([, value]) => value !== undefined) as Array<[string, string]>
		goto(params.length === 0 ? "/recherche" : `/recherche?${new URLSearchParams(params)}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true,
		})
	}
</script>

<svelte:head>
	<title>Recherche législative - Tricoteuses</title>
</svelte:head>

{#snippet suggestionView({ autocompletion, badge, date }: Suggestion)}
	{#if date !== undefined}
		<Badge variant="outline">{fullDateFormatter(date)}</Badge>
	{/if}
	{autocompletion}
	{#if badge !== undefined}
		<Badge variant="outline">{badge}</Badge>
	{/if}
{/snippet}

<div class="container mx-auto max-w-7xl px-4 py-8">
	<PageBreadcrumb segments={[{ label: "Recherche législative" }]} />

	<div class="mb-8">
		<h1 class="mb-4 flex items-center gap-3 text-4xl font-bold">
			<SearchIcon size={32} />
			Recherche de documents législatifs
		</h1>
		<p class="text-lg text-muted-foreground">
			Recherchez dans les lois, textes législatifs, journaux officiels et dossiers
			parlementaires.
		</p>
	</div>

	<Card.Root class="mb-8">
		<Card.Content class="py-6">
			<section class="mb-6 space-y-2">
				<p>
					Tapez les premiers caractères d'un texte législatif ou collez une référence ou un
					identifiant.
				</p>

				<p class="text-sm italic text-muted-foreground">
					<b>Exemples</b> : {#each sampleSearches as sampleSearch, i}{i === 0
							? ""
							: ", "}<a
							class="hover:underline"
							data-sveltekit-reload
							href="/recherche?q={encodeURIComponent(sampleSearch)}">{sampleSearch}</a
						>{/each}…
				</p>
			</section>

			<Command.Root shouldFilter={false}>
				<InputGroup.Root class="[--radius:1rem]">
					<InputGroup.Input
						placeholder="Nom de loi ou de projet de loi ou de JO…"
						bind:value={
							() => q,
							(value) => {
								q = value
								updateUrlSearchParams()
							}
						}
					/>
					<InputGroup.Addon>
						<SearchIcon />
					</InputGroup.Addon>
					<InputGroup.Addon align="inline-end">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<InputGroup.Button
										{...props}
										variant="ghost"
										class="pr-1.5! text-xs"
									>
										{typeFilter === undefined ? "Chercher dans…" : typeFilter}
										<ChevronDownIcon class="size-3" />
									</InputGroup.Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end" class="[--radius:0.95rem]">
								<DropdownMenu.RadioGroup
									bind:value={
										() => typeFilter ?? "",
										(value) => {
											typeFilter = value || undefined
											updateUrlSearchParams()
										}
									}
								>
									<DropdownMenu.RadioItem value=""
										><i>Tous</i></DropdownMenu.RadioItem
									>
									<DropdownMenu.Separator />
									{#each possibleTypes as possibleType}
										<DropdownMenu.RadioItem value={possibleType}
											>{possibleType}</DropdownMenu.RadioItem
										>
									{/each}
								</DropdownMenu.RadioGroup>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</InputGroup.Addon>
				</InputGroup.Root>
				<Command.List class="mt-4">
					<Command.Empty>Aucun résultat trouvé.</Command.Empty>
					<Command.Group>
						{#each suggestions as suggestion (`${suggestion.id}_${suggestion.autocompletion}`)}
							{@const urlPath = urlPathFromId(suggestion.id)}
							<Command.Item>
								{#if urlPath === null}
									{@render suggestionView(suggestion)}
								{:else}
									<a data-sveltekit-reload href={urlPath}
										>{@render suggestionView(suggestion)}</a
									>
								{/if}
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="py-6">
			<h2 class="mb-4 text-2xl font-bold">À propos de la recherche</h2>
			<p class="mb-4 text-muted-foreground">
				Cette interface de recherche vous permet d'explorer l'ensemble des documents législatifs
				français indexés par Tricoteuses : lois, ordonnances, décrets, journaux officiels,
				dossiers parlementaires et bien plus.
			</p>
			<p class="text-sm text-muted-foreground">
				Les résultats sont mis à jour quotidiennement à partir des données officielles de
				l'Assemblée Nationale et de Légifrance.
			</p>
		</Card.Content>
	</Card.Root>
</div>
