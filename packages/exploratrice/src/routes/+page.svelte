<script lang="ts">
  import { onDestroy, onMount } from "svelte"

  import type { Suggestion } from "$lib/autocompletion.js"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Item from "$lib/components/ui/item/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"
  import {FileTextIcon, FolderOpenIcon, NewspaperIcon, ScaleIcon} from "@lucide/svelte"

  import { queryHomePageInfos } from "./home.remote.js"
    import { cn } from "$lib/utils.js"

  let intervalId: NodeJS.Timeout | undefined = $state(undefined)
  let { documents, dossiersParlementaires, jos, textes } = $derived(
    await queryHomePageInfos(),
  )
  let tagline = $state("")
  let taglineIndex = 0
  const taglines = [
    "",
    ", la loi sous git",
    ", la loi en liens",
    ", la loi en diffs",
    ", la loi et sa genèse",
    ", la loi en données publiques",
    ", la loi en logiciel libre",
    ", la loi en temps réel",
  ] as const

  onMount(() => {
    // Start the interval and store its ID to clear it later
    intervalId = setInterval(() => {
      taglineIndex++
      if (taglineIndex >= taglines.length) {
        taglineIndex = 0
      }
      tagline = taglines[taglineIndex]
    }, 3000)
  })

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId)
    }
  })
</script>

{#snippet suggestionItemContent({ autocompletion, badge, date }: Suggestion)}
  <Item.Content class="overflow-x-auto">
    <Item.Title class="flex justify-between w-full">
      {#if date !== undefined}
        <Badge variant="outline">{fullDateFormatter(date)}</Badge>
      {/if}
      
      {#if badge !== undefined}
        {@const commonStyles = "font-bold font-serif"}

        {#if badge === "JO"}
          <Badge class={cn(commonStyles, "bg-badge-jo text-badge-jo-foreground hover:bg-badge-jo/90")}>
            <NewspaperIcon />
            {badge}
          </Badge>
        {:else if ["loi", "ordonnance"].includes(badge.toLowerCase())}
          <Badge class={cn(commonStyles, "bg-badge-law text-badge-law-foreground hover:bg-badge-law/90")}>
            <ScaleIcon />
            {badge}
          </Badge>
        {:else if badge === "Résolution" || badge.startsWith("Projet")}
          <Badge class={cn(commonStyles, "bg-badge-folder text-badge-folder-foreground hover:bg-badge-folder/90")}>
            <FolderOpenIcon />
            {badge}
          </Badge>
        {:else if badge === "Rapport"}
          <Badge class={cn(commonStyles, "bg-badge-report text-badge-report-foreground hover:bg-badge-report/90")}>
            <FileTextIcon />
            {badge}
          </Badge>
        {/if}
      {/if}
    </Item.Title>

    <Item.Description>{autocompletion}</Item.Description>
  </Item.Content>
{/snippet}

<!-- Hero Section -->
<div class="mb-6 lg:mb-8">
  <h1 class="scroll-m-20 text-2xl font-bold tracking-tight">
    Tricoteuses<span class="text-primary">{tagline}</span>
  </h1>
  <p class="text-muted-foreground">
    Explorez les documents législatifs français : journaux officiels, lois, dossiers parlementaires et leurs liens
  </p>
</div>

<!-- Grid Container -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
  <!-- Section: Journaux Officiels -->
  <section class="rounded-lg border bg-card p-6">
    <h2 class="scroll-m-20 text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
      <NewspaperIcon />
      Les derniers journaux officiels
    </h2>
    <Item.Group>
      {#each jos.slice(0, 6) as suggestion}
        {@const urlPath = urlPathFromId(suggestion.id)}
        <Item.Root variant="outline" size="sm">
          {#snippet child({ props })}
            {#if urlPath === null}
              {@render suggestionItemContent(suggestion)}
            {:else}
              <a data-sveltekit-reload href={urlPath} {...props}>
                {@render suggestionItemContent(suggestion)}
              </a>
            {/if}
          {/snippet}
        </Item.Root>
      {/each}
    </Item.Group>
  </section>

  <!-- Section: Textes Promulgués -->
  <section class="rounded-lg border bg-card p-6">
    <h2 class="scroll-m-20 text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
      <ScaleIcon />
      Les derniers textes promulgués
    </h2>
    <Item.Group>
      {#each textes.slice(0, 6) as suggestion}
        {@const urlPath = urlPathFromId(suggestion.id)}
        <Item.Root variant="outline" size="sm">
          {#snippet child({ props })}
            {#if urlPath === null}
              {@render suggestionItemContent(suggestion)}
            {:else}
              <a data-sveltekit-reload href={urlPath} {...props}>
                {@render suggestionItemContent(suggestion)}
              </a>
            {/if}
          {/snippet}
        </Item.Root>
      {/each}
    </Item.Group>
  </section>

  <!-- Section: Dossiers Législatifs -->
  <section class="rounded-lg border bg-card p-6">
    <h2 class="scroll-m-20 text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
      <FolderOpenIcon />
      Les derniers dossiers législatifs en cours
    </h2>
    <Item.Group>
      {#each dossiersParlementaires.slice(0, 6) as suggestion}
        {@const urlPath = urlPathFromId(suggestion.id)}
        <Item.Root variant="outline" size="sm">
          {#snippet child({ props })}
            {#if urlPath === null}
              {@render suggestionItemContent(suggestion)}
            {:else}
              <a data-sveltekit-reload href={urlPath} {...props}>
                {@render suggestionItemContent(suggestion)}
              </a>
            {/if}
          {/snippet}
        </Item.Root>
      {/each}
    </Item.Group>
  </section>

  <!-- Section: Documents Assemblée -->
  <section class="rounded-lg border bg-card p-6">
    <h2 class="scroll-m-20 text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
      <FileTextIcon />
      Les derniers textes publiés
    </h2>
    <Item.Group>
      {#each documents.slice(0, 6) as suggestion}
        {@const urlPath = urlPathFromId(suggestion.id)}
        <Item.Root variant="outline" size="sm">
          {#snippet child({ props })}
            {#if urlPath === null}
              {@render suggestionItemContent(suggestion)}
            {:else}
              <a data-sveltekit-reload href={urlPath} {...props}>
                {@render suggestionItemContent(suggestion)}
              </a>
            {/if}
          {/snippet}
        </Item.Root>
      {/each}
    </Item.Group>
  </section>
</div>
