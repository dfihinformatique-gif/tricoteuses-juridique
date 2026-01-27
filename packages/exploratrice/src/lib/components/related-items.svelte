<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import type { Reuse, DataService } from "$lib/data/tricoteuses-ecosystem.js"
  import ChevronRight from "@lucide/svelte/icons/chevron-right"

  interface RelatedItemsProps {
    items: Array<Reuse | DataService>
  }

  let { items }: RelatedItemsProps = $props()

  function isDataService(item: Reuse | DataService): item is DataService {
    return (
      "type" in item &&
      ["api", "git", "mcp", "consolidation", "database"].includes(item.type)
    )
  }

  function getItemUrl(item: Reuse | DataService): string {
    if (isDataService(item)) {
      return `/services/${item.id}`
    }
    return `/reutilisations/${item.id}`
  }

  function getItemBadge(item: Reuse | DataService): string {
    if (isDataService(item)) {
      const service = item as DataService
      switch (service.type) {
        case "api":
          return "API"
        case "git":
          return "Git"
        case "mcp":
          return "MCP"
        case "consolidation":
          return "Code"
        case "database":
          return "BDD"
        default:
          return service.type
      }
    }
    const reuse = item as Reuse
    return reuse.type === "external" ? "Externe" : "Démo"
  }
</script>

{#if items.length > 0}
  <div class="space-y-2">
    {#each items as item}
      <a
        href={getItemUrl(item)}
        class="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
      >
        <div class="flex items-center gap-3">
          <ChevronRight class="h-5 w-5 flex-none text-muted-foreground" />
          <div>
            <div class="font-medium">{item.name}</div>
            {#if item.description}
              <div class="line-clamp-1 text-sm text-muted-foreground">
                {item.description}
              </div>
            {/if}
          </div>
        </div>
        <Badge variant="outline" class="flex-none">{getItemBadge(item)}</Badge>
      </a>
    {/each}
  </div>
{/if}
