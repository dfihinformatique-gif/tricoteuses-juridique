<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import ExternalProjectCard from "$lib/components/external-project-card.svelte"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { externalProjects } from "$lib/data/tricoteuses-ecosystem.js"
  import Filter from "@lucide/svelte/icons/filter"
  import Plus from "@lucide/svelte/icons/plus"

  let selectedFeatured = $state<boolean | "all">("all")

  const filteredProjects = $derived.by(() => {
    if (selectedFeatured === "all") return externalProjects
    return externalProjects.filter((p) => p.featured === selectedFeatured)
  })

  const filterButtons: Array<{ label: string; type: boolean | "all" }> = [
    { label: "Tous", type: "all" },
    { label: "En vedette", type: true },
    { label: "Autres", type: false },
  ]
</script>

<svelte:head>
  <title>Projets externes complémentaires - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: "Projets externes complémentaires" }]} />

  <!-- Header -->
  <header class="mb-12">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h1 class="mb-4 text-4xl font-bold">
          Projets externes complémentaires
        </h1>
        <p class="text-lg text-muted-foreground">
          Découvrez les projets open source externes qui complètent l'écosystème
          Tricoteuses pour manipuler l'opendata législatif et juridique.
        </p>
      </div>
      <Button href="/projets-externes/proposer" class="flex-none">
        <Plus class="mr-2 h-4 w-4" />
        Proposer un projet externe
      </Button>
    </div>
  </header>

  <!-- Filters -->
  <div class="mb-8 flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2 text-sm font-medium">
      <Filter class="h-4 w-4" />
      <span>Filtrer :</span>
    </div>
    {#each filterButtons as filter}
      <Button
        variant={selectedFeatured === filter.type ? "default" : "outline"}
        size="sm"
        onclick={() => (selectedFeatured = filter.type)}
      >
        {filter.label}
      </Button>
    {/each}
  </div>

  <!-- Results count -->
  <div class="mb-4 text-sm text-muted-foreground">
    {filteredProjects.length}
    {filteredProjects.length === 1 ? "projet" : "projets"}
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
        Aucun projet trouvé pour ce filtre.
      </p>
    </div>
  {/if}
</div>
