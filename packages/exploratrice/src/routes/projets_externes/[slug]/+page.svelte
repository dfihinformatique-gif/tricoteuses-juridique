<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { type ExternalProject } from "$lib/data/tricoteuses-ecosystem.js"
  import {
    getExternalProjectName,
    getExternalProjectDescription,
    getExternalProjectAuthor,
  } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import GitBranchIcon from "@lucide/svelte/icons/git-branch"
  import UserIcon from "@lucide/svelte/icons/user"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"

  import type { PageData } from "./$types"

  let { data }: { data: PageData } = $props()

  const project: ExternalProject = $derived(data.project)
  const localizedName = $derived(getExternalProjectName(project.id))
  const localizedDescription = $derived(
    getExternalProjectDescription(project.id),
  )
  const localizedAuthor = $derived(getExternalProjectAuthor(project.id))
</script>

<svelte:head>
  <title>{m.external_project_detail_page_title({ name: localizedName })}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      {
        label: m.external_project_detail_breadcrumb(),
        href: localizedHref("/projets_externes"),
      },
      { label: localizedName },
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
            <h1 class="mb-2 text-4xl font-bold">{localizedName}</h1>
            <div class="flex flex-wrap gap-2">
              <Badge class="bg-blue-500 hover:bg-blue-600">
                {m.external_project_detail_badge()}
              </Badge>
              <Badge
                variant="outline"
                class="max-w-64 truncate!"
                title={localizedAuthor}
              >
                <UserIcon class="mr-1 h-3 w-3 shrink-0" />
                <span class="truncate">{localizedAuthor}</span>
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
        {localizedDescription}
      </p>

      <!-- Screenshot -->
      {#if project.screenshot !== undefined}
        <div class="mb-6">
          <img
            src={project.screenshot}
            alt={m.external_project_detail_screenshot_alt({
              name: localizedName,
            })}
            class="rounded-lg border shadow-lg"
          />
        </div>
      {/if}

      <!-- Links -->
      <div class="flex flex-wrap gap-3">
        {#if project.url !== undefined}
          <Button href={project.url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon class="mr-2 h-4 w-4" />
            {m.external_project_detail_visit_site()}
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
            {m.external_project_detail_source_code()}
          </Button>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- About this project section -->
  <Card.Root>
    <Card.Content class="py-6">
      <h2 class="mb-4 text-2xl font-bold">
        {m.external_project_detail_about_title()}
      </h2>
      <p class="mb-4 text-muted-foreground">
        {@html m.external_project_detail_about_description({
          author: localizedAuthor,
        })}
      </p>
      <p class="text-sm text-muted-foreground">
        {m.external_project_detail_about_contribute()}
      </p>
      <div class="mt-4">
        <Button
          href={localizedHref("/projets_externes/proposer")}
          variant="outline"
        >
          {m.external_project_detail_propose_button()}
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
