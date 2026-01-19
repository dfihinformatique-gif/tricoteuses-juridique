<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import * as Item from "$lib/components/ui/item/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { cn } from "$lib/utils.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"
  import type { Suggestion } from "$lib/autocompletion.js"
  import { ChevronLeftIcon, ChevronRightIcon, NewspaperIcon, ScaleIcon } from "@lucide/svelte"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const currentPage = $derived(data.currentPage)
  const jos = $derived(data.jos)
  const totalPages = $derived(data.totalPages)
</script>

{#snippet suggestionItemContent({ autocompletion, badge, date }: Suggestion)}
  <Item.Content class="overflow-x-auto">
    <Item.Title class="flex w-full justify-between">
      {#if date !== undefined}
        <time datetime={date} class="text-sm font-bold first-letter:uppercase">
          {fullDateFormatter(date)}
        </time>
      {/if}

      {#if badge !== undefined}
        {@const commonStyles = "font-bold"}
        <Badge
          class={cn(
            commonStyles,
            "bg-badge-jo text-badge-jo-foreground hover:bg-badge-jo/90",
          )}
        >
          <NewspaperIcon />
          {badge}
        </Badge>
      {/if}
    </Item.Title>

    <Item.Description>
      {autocompletion}
    </Item.Description>
  </Item.Content>
{/snippet}

<svelte:head>
  <title>Journaux officiels - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: "Journaux officiels" }]} />

  <div class="mb-8">
    <h1 class="mb-4 flex items-center gap-3 text-4xl font-bold">
      <NewspaperIcon size={32} />
      Les derniers journaux officiels
    </h1>
    <p class="text-lg text-muted-foreground">
      Explorez les journaux officiels de la République française publiés récemment.
    </p>
  </div>

  <Card.Root>
    <Card.Content class="py-6">
      <Item.Group>
        {#each jos as suggestion (suggestion.id)}
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

  {#if totalPages > 1}
    <div class="mt-8 flex items-center justify-center gap-4">
      {#if currentPage > 1}
        <Button
          variant="outline"
          href="?page={currentPage - 1}"
        >
          <ChevronLeftIcon class="mr-2 h-4 w-4" />
          Précédent
        </Button>
      {/if}

      <span class="text-sm text-muted-foreground">
        Page {currentPage} sur {totalPages}
      </span>

      {#if currentPage < totalPages}
        <Button
          variant="outline"
          href="?page={currentPage + 1}"
        >
          Suivant
          <ChevronRightIcon class="ml-2 h-4 w-4" />
        </Button>
      {/if}
    </div>
  {/if}
</div>
