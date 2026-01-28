<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import {
    dataServices,
    type DataService,
  } from "$lib/data/tricoteuses-ecosystem.js"
  import Filter from "@lucide/svelte/icons/filter"
  import * as m from "$lib/paraglide/messages.js"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"

  // Initialiser selectedType depuis l'URL
  let selectedType = $state<DataService["type"] | "all">(
    ($page.url.searchParams.get("type") as DataService["type"]) || "all",
  )

  // Fonction pour mettre à jour l'URL quand le filtre change
  function updateFilter(type: DataService["type"] | "all") {
    selectedType = type
    const url = new URL($page.url)
    if (type === "all") {
      url.searchParams.delete("type")
    } else {
      url.searchParams.set("type", type)
    }
    goto(url, { replaceState: true, noScroll: true })
  }

  const filteredServices = $derived.by(() => {
    const allServices = Object.values(dataServices)
    if (selectedType === "all") return allServices
    return allServices.filter((s) => s.type === selectedType)
  })

  const filterButtons = $derived<
    Array<{
      label: string
      type: DataService["type"] | "all"
    }>
  >([
    { label: m.services_filter_all(), type: "all" },
    { label: m.services_filter_api(), type: "api" },
    { label: m.services_filter_database(), type: "database" },
    { label: m.services_filter_git(), type: "git" },
    { label: m.services_filter_mcp(), type: "mcp" },
    { label: m.services_filter_consolidation(), type: "consolidation" },
  ])
</script>

<svelte:head>
  <title>{m.services_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.nav_services() }]} />

  <!-- Header -->
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">{m.services_title()}</h1>
    <p class="text-lg text-muted-foreground">
      {m.services_description()}
    </p>
  </header>

  <!-- Filters -->
  <div class="mb-8 flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2 text-sm font-medium">
      <Filter class="h-4 w-4" />
      <span>{m.services_filter()}</span>
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
    {filteredServices.length}
    {filteredServices.length === 1
      ? m.services_count_single()
      : m.services_count_plural()}
    {selectedType !== "all"
      ? `(${filterButtons.find((f) => f.type === selectedType)?.label})`
      : ""}
  </div>

  <!-- Services grid -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each filteredServices as service (service.id)}
      <ServiceCard {service} />
    {/each}
  </div>

  {#if filteredServices.length === 0}
    <div class="py-12 text-center">
      <p class="text-lg text-muted-foreground">
        {m.services_no_results()}
      </p>
    </div>
  {/if}
</div>
