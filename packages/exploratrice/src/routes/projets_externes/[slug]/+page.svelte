<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { type ExternalProject } from "$lib/data/tricoteuses-ecosystem.js"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import GitBranchIcon from "@lucide/svelte/icons/git-branch"
  import UserIcon from "@lucide/svelte/icons/user"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const project: ExternalProject = $derived(data.project)
</script>

packages/exploratrice/src/routes/external-projects/[slug]/+page.svelte
<svelte:head>
  <title>{project.name} - Projets externes - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      { label: "Projets externes complémentaires", href: "/projets-externes" },
      { label: project.name },
    ]}
  />

  <!-- Project details -->
  <Card.Root class="mb-8 border-l-4 border-l-blue-500">
    <Card.Content class="py-6">
      <!-- Header with icon, title and badge -->
      <div class="mb-4 flex items-start justify-between">
        <div class="flex items-start gap-4">
          <div class="rounded-lg bg-muted p-3">
            <ExternalLinkIcon size={32}></ExternalLinkIcon>
          </div>
          <div>
            <h1 class="mb-2 text-4xl font-bold">{project.name}</h1>
            <div class="flex flex-wrap gap-2">
              <Badge class="bg-blue-500 hover:bg-blue-600">
                Projet externe complémentaire
              </Badge>
              <Badge
                variant="outline"
                class="max-w-64 truncate!"
                title={project.author}
              >
                <UserIcon class="mr-1 h-3 w-3 shrink-0" />
                <span class="truncate">{project.author}</span>
              </Badge>
              {#if project.license}
                <Badge variant="outline">
                  {project.license.name}
                </Badge>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p class="mb-6 text-lg text-muted-foreground">
        {project.description}
      </p>

      <!-- Screenshot -->
      {#if project.screenshot !== undefined}
        <div class="mb-6">
          <img
            src={project.screenshot}
            alt="Capture d'écran de {project.name}"
            class="rounded-lg border shadow-lg"
          />
        </div>
      {/if}

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        {#if project.url !== undefined}
          <Button href={project.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="mr-2 h-4 w-4" />
            Visiter le site
          </Button>
        {/if}
        {#if project.repositoryUrl !== undefined}
          <Button
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            <GitBranchIcon class="mr-2 h-4 w-4" />
            Code source
          </Button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- About this project section -->
  <Card.Root>
    <Card.Content class="py-6">
      <h2 class="mb-4 text-2xl font-bold">À propos de ce projet</h2>
      <p class="mb-4 text-muted-foreground">
        Ce projet a été développé par <strong>{project.author}</strong>. Il est
        complémentaire à l'écosystème des Tricoteuses pour manipuler l'opendata
        législatif et juridique.
      </p>
      <p class="text-sm text-muted-foreground">
        Vous aussi, vous pouvez proposer des projets externes complémentaires
        qui enrichissent l'écosystème libre et open source autour des données
        publiques juridiques françaises.
      </p>
      <div class="mt-4">
        <Button href="/projets-externes/proposer" variant="outline">
          Proposer un projet externe
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
