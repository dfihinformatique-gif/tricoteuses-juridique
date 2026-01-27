<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import { type Software } from "$lib/data/tricoteuses-ecosystem.js"
  import CodeIcon from "@lucide/svelte/icons/code"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import MailIcon from "@lucide/svelte/icons/mail"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const software: Software = $derived(data.software)
  const servicesDependencies = $derived(software.servicesDependencies ?? [])
  const sourceDataDependencies = $derived(software.sourceDataDependencies ?? [])
  const softwareDependencies = $derived(software.softwareDependencies ?? [])
</script>

<svelte:head>
  <title>{software.name} - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      { label: "Logiciels", href: "/logiciels" },
      { label: software.name },
    ]}
  />

  <!-- Software details -->
  <Card.Root class="mb-8 border-l-4 border-l-indigo-500">
    <Card.Content class="py-6">
      <!-- Header with icon, title and badge -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-lg bg-muted p-3">
            <CodeIcon size={32} />
          </div>
          <div>
            <h1 class="mb-2 text-4xl font-bold">{software.name}</h1>
            <div class="flex flex-wrap items-center gap-2">
              <Badge class="bg-indigo-500 hover:bg-indigo-600">
                Logiciel libre
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-muted-foreground">
        {software.description}
      </p>

      <!-- License, Authors and Copyright Holders -->
      <div class="mb-6 space-y-3 rounded-lg border bg-muted/50 p-4">
        <div>
          <h3 class="mb-1 text-sm font-semibold">Licence</h3>
          <a
            href={software.license.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-muted-foreground underline hover:text-foreground"
          >
            {software.license.spdxId || software.license.name}
          </a>
        </div>
        {#if software.authors.length > 0}
          <div>
            <h3 class="mb-1 text-sm font-semibold">Auteurs</h3>
            <div class="flex flex-wrap gap-2">
              {#each software.authors as author}
                {#if author.email}
                  <a
                    href="mailto:{author.email}"
                    class="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    <MailIcon class="mr-1 inline h-3 w-3" />
                    {author.name}
                  </a>
                {:else}
                  <span class="text-sm text-muted-foreground">
                    {author.name}
                  </span>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
        <div>
          <h3 class="mb-1 text-sm font-semibold">Fichier de licence</h3>
          <a
            href={software.licenseFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-muted-foreground underline hover:text-foreground"
          >
            <ExternalLinkIcon class="mr-1 inline h-3 w-3" />
            LICENSE.md
          </a>
        </div>
      </div>

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        <Button
          href={software.repositoryUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLinkIcon class="mr-2 h-4 w-4" />
          Code source
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Services Dependencies section -->
  {#if servicesDependencies.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Services utilisés</h2>
      <p class="mb-6 text-muted-foreground">
        Ce logiciel utilise {servicesDependencies.length} service{servicesDependencies.length >
        1
          ? "s"
          : ""} Tricoteuses.
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each servicesDependencies as service (service.id)}
          <ServiceCard {service} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Source Data Dependencies section -->
  {#if sourceDataDependencies.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Sources de données</h2>
      <p class="mb-6 text-muted-foreground">
        Ce logiciel utilise {sourceDataDependencies.length} source{sourceDataDependencies.length >
        1
          ? "s"
          : ""} de données publiques.
      </p>
      <div class="space-y-4">
        {#each sourceDataDependencies as source (source.id)}
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
                    {source.license.spdxId || source.license.name}
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

  <!-- Software Dependencies section -->
  {#if softwareDependencies.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-2xl font-bold">Dépendances logicielles</h2>
      <p class="mb-6 text-muted-foreground">
        Ce logiciel dépend de {softwareDependencies.length} autre{softwareDependencies.length >
        1
          ? "s"
          : ""} logiciel{softwareDependencies.length > 1 ? "s" : ""}.
      </p>
      <div class="space-y-4">
        {#each softwareDependencies as soft (soft.id)}
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

  <!-- About this software section -->
  <Card.Root>
    <Card.Content class="py-6">
      <h2 class="mb-4 text-2xl font-bold">À propos de ce logiciel</h2>
      <p class="mb-4 text-muted-foreground">
        Ce logiciel libre fait partie de l'écosystème Tricoteuses. Il est
        distribué sous licence {software.license.spdxId ||
          software.license.name}.
      </p>
      <p class="text-sm text-muted-foreground">
        Le code source est disponible publiquement et peut être réutilisé selon
        les termes de la licence.
      </p>
    </Card.Content>
  </Card.Root>
</div>
