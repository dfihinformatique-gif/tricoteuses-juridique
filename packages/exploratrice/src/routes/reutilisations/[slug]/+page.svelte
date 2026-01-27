<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import { type Reuse } from "$lib/data/tricoteuses-ecosystem.js"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import FlaskConicalIcon from "@lucide/svelte/icons/flask-conical"
  import UserIcon from "@lucide/svelte/icons/user"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const reuse: Reuse = $derived(data.reuse)
  const services = $derived(reuse.servicesDependencies)
  const softwareList = $derived(reuse.softwareDependencies ?? [])

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
        return "Réutilisation externe"
      case "demo":
        return "Démonstration Tricoteuses"
      default:
        return type
    }
  }
</script>

<svelte:head>
  <title>{reuse.name} - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      { label: "Réutilisations", href: "/reutilisations" },
      { label: reuse.name },
    ]}
  />

  <!-- Reuse details -->
  <Card.Root class="mb-8 border-l-4 {getReuseColor(reuse.type)}">
    <Card.Content class="py-6">
      <!-- Header with icon, title and badge -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-lg bg-muted p-3">
            <reuseIcon size={32}></reuseIcon>
          </div>
          <div>
            <h1 class="mb-2 text-4xl font-bold">{reuse.name}</h1>
            <div class="flex flex-wrap gap-2">
              <Badge class={getTypeBadgeColor(reuse.type)}>
                {getTypeLabel(reuse.type)}
              </Badge>
              <Badge variant="outline">
                <UserIcon class="mr-1 h-3 w-3" />
                {reuse.author}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-muted-foreground">
        {reuse.description}
      </p>

      <!-- Screenshot -->
      {#if reuse.screenshot !== undefined}
        <div class="mb-6">
          <img
            src={reuse.screenshot}
            alt="Capture d'écran de {reuse.name}"
            class="rounded-lg border shadow-lg"
          />
        </div>
      {/if}

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        {#if reuse.type === "external" && reuse.url !== undefined}
          <Button href={reuse.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="mr-2 h-4 w-4" />
            Visiter le site
          </Button>
        {:else if reuse.type === "demo" && reuse.pathname !== undefined}
          <Button href={reuse.pathname}>
            <FlaskConicalIcon class="mr-2 h-4 w-4" />
            Essayer la démonstration
          </Button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Services used section -->
  {#if services.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Services Tricoteuses utilisés</h2>
      <p class="mb-6 text-muted-foreground">
        Cette réutilisation utilise {services.length} service{services.length >
        1
          ? "s"
          : ""} Tricoteuses.
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
      <h2 class="mb-4 text-2xl font-bold">Logiciels utilisés</h2>
      <p class="mb-6 text-muted-foreground">
        Cette réutilisation utilise {softwareList.length} logiciel{softwareList.length >
        1
          ? "s"
          : ""} libre{softwareList.length > 1 ? "s" : ""}.
      </p>
      <div class="space-y-4">
        {#each softwareList as soft (soft.id)}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">
                <a href="/logiciels/{soft.id}" class="hover:underline">
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

  <!-- About this project section (for external reuses) -->
  {#if reuse.type === "external"}
    <Card.Root>
      <Card.Content class="py-6">
        <h2 class="mb-4 text-2xl font-bold">À propos de ce projet</h2>
        <p class="mb-4 text-muted-foreground">
          Ce projet a été développé par <strong>{reuse.author}</strong> en utilisant
          les données et services fournis par Tricoteuses.
        </p>
        <p class="text-sm text-muted-foreground">
          Vous aussi, vous pouvez créer votre propre application en utilisant
          nos services ouverts et nos APIs modernes.
        </p>
        <div class="mt-4">
          <Button href="/reutilisations/proposer" variant="outline">
            Proposer votre réutilisation
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- About this demo section (for demos) -->
  {#if reuse.type === "demo"}
    <Card.Root>
      <Card.Content class="py-6">
        <h2 class="mb-4 text-2xl font-bold">À propos de cette démonstration</h2>
        <p class="mb-4 text-muted-foreground">
          Cette démonstration a été développée par les Tricoteuses pour
          illustrer comment utiliser nos services et APIs.
        </p>
        <p class="text-sm text-muted-foreground">
          Le code source de cette démonstration est disponible dans notre dépôt
          Git. Vous pouvez vous en inspirer pour créer vos propres applications.
        </p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
