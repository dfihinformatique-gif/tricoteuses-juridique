<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ReuseCard from "$lib/components/reuse-card.svelte"
  import { reuses, type Reuse } from "$lib/data/tricoteuses-ecosystem.js"
  import Filter from "@lucide/svelte/icons/filter"
  import Plus from "@lucide/svelte/icons/plus"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"

  // Initialiser selectedType depuis l'URL
  let selectedType = $state<Reuse["type"] | "all">(
    ($page.url.searchParams.get("type") as Reuse["type"]) || "all",
  )

  // Fonction pour mettre à jour l'URL quand le filtre change
  function updateFilter(type: Reuse["type"] | "all") {
    selectedType = type
    const url = new URL($page.url)
    if (type === "all") {
      url.searchParams.delete("type")
    } else {
      url.searchParams.set("type", type)
    }
    goto(url, { replaceState: true, noScroll: true })
  }

  const filteredReuses = $derived.by(() => {
    const allReuses = Object.values(reuses)
    if (selectedType === "all") return allReuses
    return allReuses.filter((r) => r.type === selectedType)
  })

  const filterButtons = $derived<
    Array<{ label: string; type: Reuse["type"] | "all" }>
  >([
    { label: m.reuses_filter_all(), type: "all" },
    { label: m.reuses_filter_external(), type: "external" },
    { label: m.reuses_filter_demo(), type: "demo" },
  ])
</script>

<svelte:head>
  <title>{m.reuses_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.nav_reuses() }]} />

  <!-- Header -->
  <header class="mb-12">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h1 class="mb-4 text-4xl font-bold">{m.reuses_title()}</h1>
        <p class="text-lg text-muted-foreground">
          {m.reuses_description()}
        </p>
      </div>
      <Button
        href={localizedHref("/reutilisations/proposer")}
        class="flex-none"
      >
        <Plus class="mr-2 h-4 w-4" />
        {m.home_cta_button()}
      </Button>
    </div>
  </header>

  <!-- Filters -->
  <div class="mb-8 flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2 text-sm font-medium">
      <Filter class="h-4 w-4" />
      <span>{m.reuses_filter()}</span>
    </div>
    {#each filterButtons as filter}
      <Button
        variant={selectedType === filter.type ? "default" : "outline"}
        size="sm"
        onclick={() => updateFilter(filter.type)}
      >
        {filter.label}
      </Button>
    {/each}
  </div>

  <!-- Results count -->
  <div class="mb-4 text-sm text-muted-foreground">
    {filteredReuses.length}
    {filteredReuses.length === 1
      ? m.reuses_count_single()
      : m.reuses_count_plural()}
    {selectedType !== "all"
      ? `(${filterButtons.find((f) => f.type === selectedType)?.label})`
      : ""}
  </div>

  <!-- Reuses grid -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each filteredReuses as reuse (reuse.id)}
      <ReuseCard {reuse} />
    {/each}
  </div>

  {#if filteredReuses.length === 0}
    <div class="py-12 text-center">
      <p class="text-lg text-muted-foreground">
        {m.reuses_no_results()}
      </p>
    </div>
  {/if}
</div>
