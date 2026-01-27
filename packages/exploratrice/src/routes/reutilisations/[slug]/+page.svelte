<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import { type Reuse } from "$lib/data/tricoteuses-ecosystem.js"
  import {
    getReuseName,
    getReuseDescription,
    getReuseAuthor,
  } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import FlaskConicalIcon from "@lucide/svelte/icons/flask-conical"
  import UserIcon from "@lucide/svelte/icons/user"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const reuse: Reuse = $derived(data.reuse)
  const services = $derived(reuse.servicesDependencies)
  const softwareList = $derived(reuse.softwareDependencies ?? [])

  const localizedName = $derived(getReuseName(reuse.id))
  const localizedDescription = $derived(getReuseDescription(reuse.id))
  const localizedAuthor = $derived(getReuseAuthor(reuse.id))

  function getReuseColor(type: Reuse["type"]) {
    switch (type) {
      case "external":
        return "border-l-purple-500"
      case "demo":
        return "border-l-orange-500"
      default:
        return "border-l-gray-500"
    }
  }

  function getTypeBadgeColor(type: Reuse["type"]) {
    switch (type) {
      case "external":
        return "bg-purple-500 hover:bg-purple-600"
      case "demo":
        return "bg-orange-500 hover:bg-orange-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  function getTypeLabel(type: Reuse["type"]) {
    switch (type) {
      case "external":
        return m.reuse_detail_type_external()
      case "demo":
        return m.reuse_detail_type_demo()
      default:
        return type
    }
  }
</script>

<svelte:head>
  <title>{m.reuse_detail_page_title({ name: localizedName })}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      {
        label: m.reuse_detail_breadcrumb_reuses(),
        href: localizedHref("/reutilisations"),
      },
      { label: localizedName },
    ]}
  />

  <!-- Reuse details -->
  <Card.Root class="mb-8 border-l-4 {getReuseColor(reuse.type)}">
    <Card.Content class="py-6">
      <!-- Header with icon, title and badge -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-lg bg-muted p-3">
            {#if reuse.type === "external"}
              <ExternalLinkIcon size={32}></ExternalLinkIcon>
            {:else}
              <FlaskConicalIcon size={32}></FlaskConicalIcon>
            {/if}
          </div>
          <div>
            <h1 class="mb-2 text-4xl font-bold">{localizedName}</h1>
            <div class="flex flex-wrap gap-2">
              <Badge class={getTypeBadgeColor(reuse.type)}>
                {getTypeLabel(reuse.type)}
              </Badge>
              <Badge variant="outline">
                <UserIcon class="mr-1 h-3 w-3" />
                {localizedAuthor}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-muted-foreground">
        {localizedDescription}
      </p>

      <!-- Screenshot -->
      {#if reuse.screenshot !== undefined}
        <div class="mb-6">
          <img
            src={reuse.screenshot}
            alt={m.reuse_detail_screenshot_alt({ name: localizedName })}
            class="rounded-lg border shadow-lg"
          />
        </div>
      {/if}

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        {#if reuse.type === "external" && reuse.url !== undefined}
          <Button href={reuse.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="mr-2 h-4 w-4" />
            {m.reuse_detail_visit_site()}
          </Button>
        {:else if reuse.type === "demo" && reuse.pathname !== undefined}
          <Button href={localizedHref(reuse.pathname)}>
            <FlaskConicalIcon class="mr-2 h-4 w-4" />
            {m.reuse_detail_try_demo()}
          </Button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Services used section -->
  {#if services.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">
        {m.reuse_detail_services_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.reuse_detail_services_description({ count: services.length })}
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each services as service (service.id)}
          <ServiceCard {service} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Software dependencies section -->
  {#if softwareList.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">
        {m.reuse_detail_software_title()}
      </h2>
      <p class="mb-6 text-muted-foreground">
        {m.reuse_detail_software_description({ count: softwareList.length })}
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
                  {m.reuse_detail_source_code()}
                </a>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </section>
  {/if}

  <!-- About this project section (for external reuses) -->
  {#if reuse.type === "external"}
    <Card.Root>
      <Card.Content class="py-6">
        <h2 class="mb-4 text-2xl font-bold">
          {m.reuse_detail_about_external_title()}
        </h2>
        <p class="mb-4 text-muted-foreground">
          {@html m.reuse_detail_about_external_description({
            author: localizedAuthor,
          })}
        </p>
        <p class="text-sm text-muted-foreground">
          {m.reuse_detail_about_external_cta()}
        </p>
        <div class="mt-4">
          <Button
            href={localizedHref("/reutilisations/proposer")}
            variant="outline"
          >
            {m.reuse_detail_about_external_button()}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- About this demo section (for demos) -->
  {#if reuse.type === "demo"}
    <Card.Root>
      <Card.Content class="py-6">
        <h2 class="mb-4 text-2xl font-bold">
          {m.reuse_detail_about_demo_title()}
        </h2>
        <p class="mb-4 text-muted-foreground">
          {m.reuse_detail_about_demo_description()}
        </p>
        <p class="text-sm text-muted-foreground">
          {m.reuse_detail_about_demo_cta()}
        </p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
