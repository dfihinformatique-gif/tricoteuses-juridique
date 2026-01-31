<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ReuseCard from "$lib/components/reuse-card.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import {
    dataServices,
    getCopyrightHolders,
    getReusesByService,
    type DataService,
    type DataSource,
  } from "$lib/data/tricoteuses-ecosystem.js"
  import { getLocalizedDataService } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import { localizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"
  import BookIcon from "@lucide/svelte/icons/book"
  import BuildingIcon from "@lucide/svelte/icons/building"
  import DatabaseIcon from "@lucide/svelte/icons/database"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import FolderIcon from "@lucide/svelte/icons/folder"
  import TerminalIcon from "@lucide/svelte/icons/terminal"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const service: DataService = $derived(getLocalizedDataService(data.service))
  const reuses = $derived(getReusesByService(service))
  const dependencies = $derived(service.serviceDependencies ?? [])
  const dependents = $derived(
    Object.values(dataServices).filter((s) =>
      s.serviceDependencies?.includes(service),
    ),
  )
  const copyrightHolders = $derived(getCopyrightHolders(service))
  const softwareList = $derived(service.softwareDependencies ?? [])

  // Get all data sources from all software used by this service
  const dataSources = $derived.by(() => {
    const sources: Record<string, DataSource> = {}
    softwareList.forEach((soft) => {
      ;(soft.sourceDataDependencies ?? []).forEach((source: DataSource) => {
        sources[source.id] = source
      })
    })
    return Object.values(sources) as DataSource[]
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

  // For dynamic component rendering
  const ServiceIconComponent = $derived(serviceIcon)

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
        return m.service_card_type_api()
      case "git":
        return m.service_card_type_git()
      case "mcp":
        return m.service_card_type_mcp()
      case "consolidation":
        return m.service_card_type_consolidation()
      case "database":
        return m.service_card_type_database()
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
      { label: m.nav_services(), href: localizedHref("/services") },
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
            <ServiceIconComponent size={32} />
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
          {m.service_detail_provided_by()}
          <a
            href={service.provider.url}
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline hover:text-foreground"
          >
            {service.provider.name}</a
          >.
        </p>
      {/if}

      <!-- License and Copyright Holders -->
      <div class="mb-6 space-y-3 rounded-lg border bg-muted/50 p-4">
        <div>
          <h3 class="mb-1 text-sm font-semibold">
            {m.service_detail_license_label()}
          </h3>
          <div class="flex flex-wrap items-center gap-2">
            {#if service.license.spdxId === "ODbL-1.0"}
              <a
                href={localizedHref("/licence_odbl")}
                class="text-sm text-muted-foreground underline hover:text-foreground"
              >
                {service.license.spdxId || service.license.name}
              </a>
            {:else}
              <a
                href={service.license.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-muted-foreground underline hover:text-foreground"
              >
                {service.license.spdxId || service.license.name}
              </a>
            {/if}
          </div>
        </div>
        <div>
          <h3 class="mb-1 text-sm font-semibold">
            {m.service_detail_copyright_holders()}
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
            {m.service_detail_access_service()}
          </Button>
        {/if}
        {#if service.technicalDocUrl !== undefined}
          {#if service.technicalDocUrl.startsWith("/")}
            <Button
              href={localizedHref(service.technicalDocUrl)}
              variant="outline"
            >
              {m.service_detail_technical_doc()}
            </Button>
          {:else}
            <Button
              href={service.technicalDocUrl}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon class="mr-2 h-4 w-4" />
              {m.service_detail_technical_doc()}
            </Button>
          {/if}
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Dependencies section -->
  {#if dependencies.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">
        {m.service_detail_dependencies_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.service_detail_dependencies_description({
          count: dependencies.length,
        })}
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
      <h2 class="mb-4 text-2xl font-bold">
        {m.service_detail_software_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.service_detail_software_description({ count: softwareList.length })}
      </p>
      <div class="space-y-4">
        {#each softwareList as soft (soft.id)}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">
                <a
                  href={localizedHref(`/logiciels/${soft.id}`)}
                  class="hover:underline"
                >
                  {soft.name}
                </a>
              </Card.Title>
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
      <h2 class="mb-4 text-2xl font-bold">
        {m.service_detail_data_sources_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.service_detail_data_sources_description({
          count: dataSources.length,
        })}
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
                {m.service_detail_data_sources_provider_label()}
                <strong>{source.provider}</strong>
              </div>
              {#if source.license}
                <div class="text-sm text-muted-foreground">
                  {m.service_detail_data_sources_license_label()}
                  {#if source.license.spdxId === "ODbL-1.0"}
                    <a
                      href={localizedHref("/licence_odbl")}
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {source.license.spdxId || source.license.name}
                    </a>
                  {:else}
                    <a
                      href={source.license.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {source.license.spdxId || source.license.name}
                    </a>
                  {/if}
                </div>
              {/if}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <ExternalLinkIcon class="mr-1 inline h-3 w-3" />
                {m.service_detail_data_sources_access()}
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
      <h2 class="mb-4 text-2xl font-bold">
        {m.service_detail_dependents_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.service_detail_dependents_description({ count: dependents.length })}
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
      <h2 class="mb-4 text-2xl font-bold">{m.service_detail_reuses_title()}</h2>
      <p class="mb-6 text-muted-foreground">
        {m.service_detail_reuses_description({ count: reuses.length })}
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
        <h2 class="mb-4 text-2xl font-bold">
          {m.service_detail_api_doc_title()}
        </h2>
        <p class="mb-4 text-muted-foreground">
          {m.service_detail_api_doc_description()}
        </p>
        {#if service.technicalDocUrl !== undefined}
          {#if service.technicalDocUrl.startsWith("/")}
            <Button
              href={localizedHref(service.technicalDocUrl)}
              variant="outline"
            >
              {m.service_detail_view_full_doc()}
            </Button>
          {:else}
            <Button
              href={service.technicalDocUrl}
              variant="outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon class="mr-2 h-4 w-4" />
              {m.service_detail_view_full_doc()}
            </Button>
          {/if}
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>
