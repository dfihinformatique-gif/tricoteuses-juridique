<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import type { ExternalProject } from "$lib/data/tricoteuses-ecosystem.js"
  import {
    getExternalProjectName,
    getExternalProjectDescription,
    getExternalProjectAuthor,
  } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import ExternalLink from "@lucide/svelte/icons/external-link"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"

  interface ExternalProjectCardProps {
    class?: string
    project: ExternalProject
  }

  let { class: className, project }: ExternalProjectCardProps = $props()

  const localizedName = $derived(getExternalProjectName(project.id))
  const localizedDescription = $derived(
    getExternalProjectDescription(project.id),
  )
  const localizedAuthor = $derived(getExternalProjectAuthor(project.id))

  const borderColorClass = "border-l-blue-500"
  const bgColorClass = "bg-blue-100 dark:bg-blue-900/30"
  const iconColorClass = "text-blue-600 dark:text-blue-400"
</script>

<a
  href={localizedHref(`/projets_externes/${project.id}`)}
  class="group block transition-transform hover:scale-[1.02] {className ?? ''}"
>
  <Card.Root class="h-full overflow-hidden border-l-4 {borderColorClass}">
    {#if project.screenshot !== undefined}
      <div class="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={project.screenshot}
          alt={m.external_project_card_screenshot_alt({ name: localizedName })}
          class="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div class="absolute top-2 right-2">
          <div class="rounded-lg {bgColorClass} p-2 shadow-md">
            <ExternalLink class="h-5 w-5 {iconColorClass}" />
          </div>
        </div>
      </div>
    {/if}
    <Card.Header>
      <Card.Title class="text-xl">{localizedName}</Card.Title>
      <Card.Description class="line-clamp-2">
        {localizedDescription}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Badge variant="default">{m.external_project_card_badge()}</Badge>
        {#if localizedAuthor}
          <span
            class="inline-block max-w-48 truncate rounded-md border border-input bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm"
            title={localizedAuthor}
          >
            {localizedAuthor}
          </span>
        {/if}
        {#if project.license}
          <Badge variant="outline"
            >{project.license.spdxId || project.license.name}</Badge
          >
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
</a>
