<script lang="ts">
  import { onDestroy, onMount } from "svelte"

  import type { Suggestion } from "$lib/autocompletion.js"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Item from "$lib/components/ui/item/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryHomePageInfos } from "./home.remote.js"

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
    <Item.Title>
      {#if date !== undefined}
        <Badge variant="outline">{fullDateFormatter(date)}</Badge>
      {/if}
      
      {#if badge !== undefined}
        <Badge variant="outline">{badge}</Badge>
      {/if}
    </Item.Title>

    <Item.Description>{autocompletion}</Item.Description>
  </Item.Content>
{/snippet}

<!-- Hero Section -->
<div class="mb-6 lg:mb-12">
  <h1 class="scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl">
    Tricoteuses<span class="text-primary">{tagline}</span>
  </h1>
  <p class="text-lg text-muted-foreground">
    Explorez les documents législatifs français : journaux officiels, lois, dossiers parlementaires et leurs liens
  </p>
</div>

<!-- Grid Container -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
  <!-- Section: Journaux Officiels -->
  <section class="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="scroll-m-20 text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
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
  <section class="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="scroll-m-20 text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
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
  <section class="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="scroll-m-20 text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
      Les derniers dossiers législatifs en cours
    </h2>
    <p class="text-sm text-muted-foreground mb-3">Assemblée nationale</p>
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
  <section class="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
    <h2 class="scroll-m-20 text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
      Les derniers textes publiés
    </h2>
    <p class="text-sm text-muted-foreground mb-3">Assemblée nationale</p>
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
