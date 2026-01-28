<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import ExternalProjectCard from "$lib/components/external-project-card.svelte"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { externalProjects } from "$lib/data/tricoteuses-ecosystem.js"
  import Filter from "@lucide/svelte/icons/filter"
  import Plus from "@lucide/svelte/icons/plus"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"

  // Initialiser selectedFeatured depuis l'URL
  const featuredParam = $page.url.searchParams.get("featured")
  let selectedFeatured = $state<boolean | "all">(
    featuredParam === "true" ? true : featuredParam === "false" ? false : "all",
  )

  // Fonction pour mettre à jour l'URL quand le filtre change
  function updateFilter(type: boolean | "all") {
    selectedFeatured = type
    const url = new URL($page.url)
    if (type === "all") {
      url.searchParams.delete("featured")
    } else {
      url.searchParams.set("featured", String(type))
    }
    goto(url, { replaceState: true, noScroll: true })
  }

  const filteredProjects = $derived.by(() => {
    if (selectedFeatured === "all") return externalProjects
    return externalProjects.filter((p) => p.featured === selectedFeatured)
  })

  const filterButtons = $derived<
    Array<{ label: string; type: boolean | "all" }>
  >([
    { label: m.external_projects_filter_all(), type: "all" },
    { label: m.external_projects_filter_featured(), type: true },
    { label: m.external_projects_filter_others(), type: false },
  ])
</script>

<svelte:head>
  <title>{m.external_projects_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.external_projects_title() }]} />

  <!-- Header -->
  <header class="mb-12">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h1 class="mb-4 text-4xl font-bold">
          {m.external_projects_title()}
        </h1>
        <p class="text-lg text-muted-foreground">
          {m.external_projects_description()}
        </p>
      </div>
      <Button
        href={localizedHref("/projets_externes/proposer")}
        class="flex-none"
      >
        <Plus class="mr-2 h-4 w-4" />
        {m.external_projects_propose_button()}
      </Button>
    </div>
  </header>

  <!-- Filters -->
  <div class="mb-8 flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2 text-sm font-medium">
      <Filter class="h-4 w-4" />
      <span>{m.external_projects_filter()}</span>
    </div>
    {#each filterButtons as filter}
      <Button
        variant={selectedFeatured === filter.type ? "default" : "outline"}
        size="sm"
        onclick={() => updateFilter(filter.type)}
      >
        {filter.label}
      </Button>
    {/each}
  </div>

  <!-- Results count -->
  <div class="mb-4 text-sm text-muted-foreground">
    {filteredProjects.length}
    {filteredProjects.length === 1
      ? m.external_projects_count_single()
      : m.external_projects_count_plural()}
    {selectedFeatured !== "all"
      ? `(${filterButtons.find((f) => f.type === selectedFeatured)?.label})`
      : ""}
  </div>

  <!-- Projects grid -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each filteredProjects as project (project.id)}
      <ExternalProjectCard {project} />
    {/each}
  </div>

  {#if filteredProjects.length === 0}
    <div class="py-12 text-center">
      <p class="text-lg text-muted-foreground">
        {m.external_projects_no_results()}
      </p>
    </div>
  {/if}
</div>
