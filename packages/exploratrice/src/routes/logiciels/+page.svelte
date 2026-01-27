<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { software } from "$lib/data/tricoteuses-ecosystem.js"
  import CodeIcon from "@lucide/svelte/icons/code"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"

  const allSoftware = $derived(software)
</script>

<svelte:head>
  <title>Logiciels libres - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: "Logiciels" }]} />

  <!-- Header -->
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">Logiciels libres</h1>
    <p class="text-lg text-muted-foreground">
      Découvrez l'ensemble des logiciels libres développés par Tricoteuses pour
      traiter, consolider et diffuser les données publiques juridiques
      françaises.
    </p>
  </header>

  <!-- Results count -->
  <div class="mb-4 text-sm text-muted-foreground">
    {allSoftware.length}
    {allSoftware.length === 1 ? "logiciel" : "logiciels"}
  </div>

  <!-- Software grid -->
  <div class="space-y-4">
    {#each allSoftware as soft (soft.id)}
      <a
        href="/logiciels/{soft.id}"
        class="group block transition-transform hover:scale-[1.01]"
      >
        <Card.Root class="border-l-4 border-l-indigo-500">
          <Card.Header>
            <div class="flex items-start gap-4">
              <div
                class="rounded-lg bg-muted p-2 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30"
              >
                <CodeIcon
                  class="h-6 w-6 text-indigo-600 dark:text-indigo-400"
                />
              </div>
              <div class="flex-1">
                <Card.Title
                  class="text-xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                >
                  {soft.name}
                </Card.Title>
                <Card.Description class="mt-1">
                  {soft.description}
                </Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                class="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {soft.license.spdxId || soft.license.name}
              </Badge>
              {#if soft.authors.length > 0}
                <Badge variant="outline">
                  {soft.authors.length} auteur{soft.authors.length > 1
                    ? "s"
                    : ""}
                </Badge>
              {/if}
              {#if soft.servicesDependencies && soft.servicesDependencies.length > 0}
                <Badge variant="outline">
                  {soft.servicesDependencies.length} service{soft
                    .servicesDependencies.length > 1
                    ? "s"
                    : ""}
                </Badge>
              {/if}
              {#if soft.sourceDataDependencies && soft.sourceDataDependencies.length > 0}
                <Badge variant="outline">
                  {soft.sourceDataDependencies.length} source{soft
                    .sourceDataDependencies.length > 1
                    ? "s"
                    : ""} de données
                </Badge>
              {/if}
            </div>
            <div>
              <a
                href={soft.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-400"
                onclick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon class="mr-1 h-3 w-3" />
                Code source
              </a>
            </div>
          </Card.Content>
        </Card.Root>
      </a>
    {/each}
  </div>

  {#if allSoftware.length === 0}
    <div class="py-12 text-center">
      <p class="text-lg text-muted-foreground">Aucun logiciel trouvé.</p>
    </div>
  {/if}
</div>
