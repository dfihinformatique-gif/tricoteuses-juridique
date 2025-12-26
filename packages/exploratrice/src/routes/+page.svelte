<script lang="ts">
  import { onDestroy, onMount } from "svelte"

  import type { Suggestion } from "$lib/autocompletion.js"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Item from "$lib/components/ui/item/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"
  import {
    FileTextIcon,
    FolderOpenIcon,
    NewspaperIcon,
    ScaleIcon,
  } from "@lucide/svelte"

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
    ", la loi sous git.",
    ", la loi en liens.",
    ", la loi en diffs.",
    ", la loi et sa genèse.",
    ", la loi en données publiques.",
    ", la loi en logiciel libre.",
    ", la loi en temps réel.",
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
    <Item.Title class="flex w-full justify-between">
      {#if date !== undefined}
        <time datetime={date} class="text-sm font-bold first-letter:uppercase"
          >{fullDateFormatter(date)}</time
        >
      {/if}

      {#if badge !== undefined}
        {@const commonStyles = "font-bold"}

        {#if badge === "JO"}
          <Badge
            class={cn(
              commonStyles,
              "bg-badge-jo text-badge-jo-foreground hover:bg-badge-jo/90",
            )}
          >
            <NewspaperIcon />
            {badge}
          </Badge>
        {:else if ["loi", "ordonnance"].includes(badge.toLowerCase())}
          <Badge
            class={cn(
              commonStyles,
              "bg-badge-law text-badge-law-foreground hover:bg-badge-law/90",
            )}
          >
            <ScaleIcon />
            {badge}
          </Badge>
        {:else if badge === "Résolution" || badge.startsWith("Projet")}
          <Badge
            class={cn(
              commonStyles,
              "bg-badge-folder text-badge-folder-foreground hover:bg-badge-folder/90",
            )}
          >
            <FolderOpenIcon />
            {badge}
          </Badge>
        {:else if badge === "Rapport"}
          <Badge
            class={cn(
              commonStyles,
              "bg-badge-report text-badge-report-foreground hover:bg-badge-report/90",
            )}
          >
            <FileTextIcon />
            {badge}
          </Badge>
        {/if}
      {/if}
    </Item.Title>

    <Item.Description>
      {autocompletion}
    </Item.Description>
  </Item.Content>
{/snippet}

<!-- Hero Card.Root -->
<div class="mb-6 lg:mb-8">
  <h1 class="mb-0">
    Tricoteuses<span class="text-primary italic">{tagline}</span>
  </h1>
  <p class="text-muted-foreground">
    Explorez les documents législatifs français : journaux officiels, lois,
    dossiers parlementaires et leurs liens.
  </p>
</div>

<!-- Grid Container -->
<div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
  <!-- Card.Root: Journaux Officiels -->
  <Card.Root>
    <Card.Content>
      <h2>
        <NewspaperIcon size={20} />
        Les derniers journaux officiels
      </h2>
      <Item.Group>
        {#each jos.slice(0, 6) as suggestion}
          {@const urlPath = urlPathFromId(suggestion.id)}
          <Item.Root variant="muted" size="sm">
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
    </Card.Content>
  </Card.Root>

  <!-- Card.Root: Textes Promulgués -->
  <Card.Root>
    <Card.Content>
      <h2>
        <ScaleIcon size={20} />
        Les derniers textes promulgués
      </h2>
      <Item.Group>
        {#each textes.slice(0, 6) as suggestion}
          {@const urlPath = urlPathFromId(suggestion.id)}
          <Item.Root variant="muted" size="sm">
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
    </Card.Content>
  </Card.Root>

  <!-- Card.Root: Dossiers Législatifs -->
  <Card.Root>
    <Card.Content>
      <h2>
        <FolderOpenIcon size={20} />
        Les derniers dossiers législatifs en cours
      </h2>
      <Item.Group>
        {#each dossiersParlementaires.slice(0, 6) as suggestion}
          {@const urlPath = urlPathFromId(suggestion.id)}
          <Item.Root variant="muted" size="sm">
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
    </Card.Content>
  </Card.Root>

  <!-- Card.Root: Documents Assemblée -->
  <Card.Root>
    <Card.Content>
      <h2>
        <FileTextIcon size={20} />
        Les derniers textes publiés
      </h2>
      <Item.Group>
        {#each documents.slice(0, 6) as suggestion}
          {@const urlPath = urlPathFromId(suggestion.id)}
          <Item.Root variant="muted" size="sm">
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
    </Card.Content>
  </Card.Root>
</div>

<style>
  h2 {
    display: flex;
    align-items: center;
    gap: 5px;
  }
</style>
