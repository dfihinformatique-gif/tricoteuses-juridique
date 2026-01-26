<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ReuseCard from "$lib/components/reuse-card.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import {
    getCopyrightHolders,
    getDataServiceDependencies,
    getDataSourcesBySoftwareId,
    getDependentDataServices,
    getReusesByServiceId,
    getSoftwareByDataServiceId,
    type DataService,
  } from "$lib/data/tricoteuses-ecosystem.js"
  import {
    BookIcon,
    BuildingIcon,
    DatabaseIcon,
    ExternalLinkIcon,
    FolderIcon,
    TerminalIcon,
  } from "@lucide/svelte"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const service: DataService = $derived(data.service)
  const reuses = $derived(getReusesByServiceId(service.id))
  const dependencies = $derived(getDataServiceDependencies(service.id))
  const dependents = $derived(getDependentDataServices(service.id))
  const copyrightHolders = $derived(getCopyrightHolders(service.id))
  const softwareList = $derived(getSoftwareByDataServiceId(service.id))

  // Get all data sources from all software used by this service
  const dataSources = $derived.by(() => {
    const sources = new Map()
    softwareList.forEach((soft) => {
      getDataSourcesBySoftwareId(soft.id).forEach((source) => {
        sources.set(source.id, source)
      })
    })
    return Array.from(sources.values())
  })

  const serviceIcon = $derived.by(() => {
    switch (service.type) {
      case "api":
        return BuildingIcon
      case "git":
        return FolderIcon
      case "mcp":
        return TerminalIcon
      case "consolidation":
        return BookIcon
      case "database":
        return DatabaseIcon
      default:
        return BuildingIcon
    }
  })

  function getServiceColor(type: DataService["type"]) {
    switch (type) {
      case "api":
        return "border-l-blue-500"
      case "git":
        return "border-l-amber-500"
      case "mcp":
        return "border-l-green-500"
      case "consolidation":
        return "border-l-slate-500"
      case "database":
        return "border-l-purple-500"
      default:
        return "border-l-gray-500"
    }
  }

  function getTypeBadgeColor(type: DataService["type"]) {
    switch (type) {
      case "api":
        return "bg-blue-500 hover:bg-blue-600"
      case "git":
        return "bg-amber-500 hover:bg-amber-600"
      case "mcp":
        return "bg-green-500 hover:bg-green-600"
      case "consolidation":
        return "bg-slate-500 hover:bg-slate-600"
      case "database":
        return "bg-purple-500 hover:bg-purple-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  function getTypeLabel(type: DataService["type"]) {
    switch (type) {
      case "api":
        return "API REST"
      case "git":
        return "Dépôt Git"
      case "mcp":
        return "Serveur MCP"
      case "consolidation":
        return "Code juridique"
      case "database":
        return "Base de données"
      default:
        return type
    }
  }
</script>

<svelte:head>
  <title>{service.name} - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      { label: "Services", href: "/services" },
      { label: service.name },
    ]}
  />

  <!-- Service details -->
  <Card.Root class="mb-8 border-l-4 {getServiceColor(service.type)}">
    <Card.Content class="py-6">
      <!-- Header with icon, title and badge -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-lg bg-muted p-3">
            <serviceIcon size={32}></serviceIcon>
          </div>
          <div>
            <h1 class="mb-2 text-4xl font-bold">{service.name}</h1>
            <div class="flex flex-wrap items-center gap-2">
              <Badge class={getTypeBadgeColor(service.type)}>
                {getTypeLabel(service.type)}
              </Badge>
              {#if service.author !== undefined}
                <Badge variant="outline">
                  {service.author}
                </Badge>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-muted-foreground">
        {service.description}
      </p>

      <!-- Provider -->
      {#if service.provider !== undefined}
        <p class="mb-6 text-sm text-muted-foreground">
          Ce service vous est proposé par <a
            href={service.provider.url}
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline hover:text-foreground"
          >
            {service.provider.name}
          </a>.
        </p>
      {/if}

      <!-- License and Copyright Holders -->
      <div class="mb-6 space-y-3 rounded-lg border bg-muted/50 p-4">
        <div>
          <h3 class="mb-1 text-sm font-semibold">Licence</h3>
          <a
            href={service.license.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-muted-foreground underline hover:text-foreground"
          >
            {service.license.name}
          </a>
        </div>
        <div>
          <h3 class="mb-1 text-sm font-semibold">
            Détenteurs de droits d'auteur
          </h3>
          <div class="flex flex-wrap gap-2">
            {#each copyrightHolders as holder (holder.id)}
              {#if holder.url}
                <a
                  href={holder.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-muted-foreground underline hover:text-foreground"
                >
                  {holder.name}
                </a>
              {:else if holder.email}
                <a
                  href="mailto:{holder.email}"
                  class="text-sm text-muted-foreground underline hover:text-foreground"
                >
                  {holder.name}
                </a>
              {:else}
                <span class="text-sm text-muted-foreground">
                  {holder.name}
                </span>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        {#if service.url !== undefined}
          <Button href={service.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="mr-2 h-4 w-4" />
            Accéder au service
          </Button>
        {/if}
        {#if service.technicalDocUrl !== undefined}
          {#if service.technicalDocUrl.startsWith("/")}
            <Button href={service.technicalDocUrl} variant="outline">
              Documentation technique
            </Button>
          {:else}
            <Button
              href={service.technicalDocUrl}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon class="mr-2 h-4 w-4" />
              Documentation technique
            </Button>
          {/if}
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Dependencies section -->
  {#if dependencies.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Dépendances</h2>
      <p class="mb-6 text-muted-foreground">
        Ce service dépend de {dependencies.length} autre{dependencies.length > 1
          ? "s"
          : ""} service{dependencies.length > 1 ? "s" : ""}.
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each dependencies as dependency (dependency.id)}
          <ServiceCard service={dependency} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Software section -->
  {#if softwareList.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Logiciels</h2>
      <p class="mb-6 text-muted-foreground">
        Ce service est généré par {softwareList.length} logiciel{softwareList.length >
        1
          ? "s"
          : ""} libre{softwareList.length > 1 ? "s" : ""}.
      </p>
      <div class="space-y-4">
        {#each softwareList as soft (soft.id)}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">{soft.name}</Card.Title>
              <Card.Description>{soft.description}</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <Badge variant="secondary"
                  >{soft.license.spdxId || soft.license.name}</Badge
                >
                <a
                  href={soft.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  <ExternalLinkIcon class="mr-1 inline h-3 w-3" />
                  Code source
                </a>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Data Sources section -->
  {#if dataSources.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Sources de données</h2>
      <p class="mb-6 text-muted-foreground">
        Ce service utilise {dataSources.length} source{dataSources.length > 1
          ? "s"
          : ""} de données publiques.
      </p>
      <div class="space-y-4">
        {#each dataSources as source (source.id)}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">{source.name}</Card.Title>
              <Card.Description>{source.description}</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-3">
              <div class="text-sm text-muted-foreground">
                Fournisseur : <strong>{source.provider}</strong>
              </div>
              {#if source.license}
                <div class="text-sm text-muted-foreground">
                  Licence : <a
                    href={source.license.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {source.license.name}
                  </a>
                </div>
              {/if}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLinkIcon class="mr-1 inline h-3 w-3" />
                Accéder à la source
              </a>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Dependents section -->
  {#if dependents.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Utilisé par d'autres services</h2>
      <p class="mb-6 text-muted-foreground">
        {dependents.length} autre{dependents.length > 1 ? "s" : ""} service{dependents.length >
        1
          ? "s"
          : ""} dépend{dependents.length > 1 ? "ent" : ""} de ce service.
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each dependents as dependent (dependent.id)}
          <ServiceCard service={dependent} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Used by section -->
  {#if reuses.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Utilisé par des réutilisations</h2>
      <p class="mb-6 text-muted-foreground">
        Ce service est utilisé par {reuses.length} réutilisation{reuses.length >
        1
          ? "s"
          : ""}.
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each reuses as reuse (reuse.id)}
          <ReuseCard {reuse} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Technical details section (for APIs) -->
  {#if service.type === "api"}
    <Card.Root>
      <Card.Content class="py-6">
        <h2 class="mb-4 text-2xl font-bold">Documentation technique</h2>
        <p class="mb-4 text-muted-foreground">
          Cette API fournit un accès REST aux données. Pour plus de détails sur
          les endpoints disponibles, consultez la documentation technique.
        </p>
        {#if service.technicalDocUrl !== undefined}
          {#if service.technicalDocUrl.startsWith("/")}
            <Button href={service.technicalDocUrl} variant="outline">
              Voir la documentation complète
            </Button>
          {:else}
            <Button
              href={service.technicalDocUrl}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon class="mr-2 h-4 w-4" />
              Voir la documentation complète
            </Button>
          {/if}
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
