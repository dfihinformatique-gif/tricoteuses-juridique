<script lang="ts">
  import { parseDescription, hasSpecialTags } from "$lib/openapi/description-formatter"
  import { Badge } from "$lib/components/ui/badge"

  interface Props {
    description: string
    class?: string
  }

  let { description, class: className = "text-xs text-muted-foreground" }: Props = $props()

  const segments = $derived(hasSpecialTags(description) ? parseDescription(description) : [{ type: 'text' as const, content: description }])
</script>

{#if description}
  <p class={className}>
    {#each segments as segment}
      {#if segment.type === 'text'}
        {segment.content}
      {:else if segment.type === 'link'}
        <a
          href="#{segment.linkTarget}"
          class="text-purple-600 hover:underline dark:text-purple-400 font-medium"
          title="Voir le schéma {segment.linkTarget}"
        >
          {segment.linkText}
        </a>
      {:else if segment.type === 'external-link'}
        <a
          href={segment.linkTarget}
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 hover:underline dark:text-blue-400 font-medium inline-flex items-center gap-0.5"
          title="Ouvrir {segment.linkTarget} dans un nouvel onglet"
        >
          {segment.linkText}
          <svg class="h-3 w-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      {:else if segment.type === 'deprecated'}
        <Badge variant="destructive" class="mx-1 text-xs">
          Déprécié
        </Badge>
      {:else if segment.type === 'example'}
        <Badge variant="outline" class="mx-1 text-xs">
          Exemple
        </Badge>
      {/if}
    {/each}
  </p>
{/if}
