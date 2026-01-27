<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import type { Reuse } from "$lib/data/tricoteuses-ecosystem.js"
  import {
    getReuseName,
    getReuseDescription,
    getReuseAuthor,
  } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import { localizedHref } from "$lib/i18n.js"
  import ExternalLink from "@lucide/svelte/icons/external-link"
  import FlaskConical from "@lucide/svelte/icons/flask-conical"
  import * as m from "$lib/paraglide/messages.js"

  interface ReuseCardProps {
    class?: string
    reuse: Reuse
  }

  let { class: className, reuse }: ReuseCardProps = $props()

  const localizedName = $derived(getReuseName(reuse.id))
  const localizedDescription = $derived(getReuseDescription(reuse.id))
  const localizedAuthor = $derived(getReuseAuthor(reuse.id))

  const borderColorClass = $derived(
    reuse.type === "external" ? "border-l-purple-500" : "border-l-orange-500",
  )

  const bgColorClass = $derived(
    reuse.type === "external"
      ? "bg-purple-100 dark:bg-purple-900/30"
      : "bg-orange-100 dark:bg-orange-900/30",
  )

  const iconColorClass = $derived(
    reuse.type === "external"
      ? "text-purple-600 dark:text-purple-400"
      : "text-orange-600 dark:text-orange-400",
  )

  const typeBadgeLabel = $derived(
    reuse.type === "external"
      ? m.reuse_card_type_external()
      : m.reuse_card_type_demo(),
  )

  const typeBadgeVariant = $derived(
    reuse.type === "external" ? "default" : "secondary",
  )
</script>

<a
  href={localizedHref(`/reutilisations/${reuse.id}`)}
  class="group block transition-transform hover:scale-[1.02] {className ?? ''}"
>
  <Card.Root class="h-full overflow-hidden border-l-4 {borderColorClass}">
    {#if reuse.screenshot !== undefined}
      <div class="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={reuse.screenshot}
          alt={m.reuse_card_screenshot_alt({ name: localizedName })}
          class="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div class="absolute top-2 right-2">
          <div class="rounded-lg {bgColorClass} p-2 shadow-md">
            {#if reuse.type === "external"}
              <ExternalLink class="h-5 w-5 {iconColorClass}" />
            {:else}
              <FlaskConical class="h-5 w-5 {iconColorClass}" />
            {/if}
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
        <Badge variant={typeBadgeVariant}>{typeBadgeLabel}</Badge>
        {#if localizedAuthor}
          <Badge variant="outline">{localizedAuthor}</Badge>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
</a>
