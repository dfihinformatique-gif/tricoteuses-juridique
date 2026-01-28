<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import type { DataService } from "$lib/data/tricoteuses-ecosystem.js"
  import { getLocalizedDataService } from "$lib/data/tricoteuses-ecosystem-i18n.js"
  import { localizedHref } from "$lib/i18n.js"
  import Book from "@lucide/svelte/icons/book"
  import Building from "@lucide/svelte/icons/building"
  import Database from "@lucide/svelte/icons/database"
  import Folder from "@lucide/svelte/icons/folder"
  import Terminal from "@lucide/svelte/icons/terminal"
  import * as m from "$lib/paraglide/messages.js"

  interface ServiceCardProps {
    class?: string
    service: DataService
  }

  let { class: className, service }: ServiceCardProps = $props()

  const localizedService = $derived(getLocalizedDataService(service))

  const borderColorClass = $derived.by(() => {
    switch (service.type) {
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
  })

  const bgColorClass = $derived.by(() => {
    switch (service.type) {
      case "api":
        return "bg-blue-100 dark:bg-blue-900/30"
      case "git":
        return "bg-amber-100 dark:bg-amber-900/30"
      case "mcp":
        return "bg-green-100 dark:bg-green-900/30"
      case "consolidation":
        return "bg-slate-100 dark:bg-slate-900/30"
      case "database":
        return "bg-purple-100 dark:bg-purple-900/30"
      default:
        return "bg-gray-100 dark:bg-gray-900/30"
    }
  })

  const iconColorClass = $derived.by(() => {
    switch (service.type) {
      case "api":
        return "text-blue-600 dark:text-blue-400"
      case "git":
        return "text-amber-600 dark:text-amber-400"
      case "mcp":
        return "text-green-600 dark:text-green-400"
      case "consolidation":
        return "text-slate-600 dark:text-slate-400"
      case "database":
        return "text-purple-600 dark:text-purple-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used as Svelte component in template
  const iconComponent = $derived.by(() => {
    switch (service.type) {
      case "api":
        return Building
      case "git":
        return Folder
      case "mcp":
        return Terminal
      case "consolidation":
        return Book
      case "database":
        return Database
      default:
        return Building
    }
  })

  const typeBadgeLabel = $derived.by(() => {
    switch (service.type) {
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
        return service.type
    }
  })
</script>

<a
  href={localizedHref(`/services/${service.id}`)}
  class="transition-transform hover:scale-[1.02] {className ?? ''}"
>
  <Card.Root class="h-full border-l-4 {borderColorClass}">
    <Card.Header>
      <div class="flex items-center gap-3">
        <div
          class="flex h-12 w-12 flex-none items-center justify-center rounded-lg {bgColorClass}"
        >
          <iconComponent class="h-6 w-6 {iconColorClass}"></iconComponent>
        </div>
        <Card.Title class="text-xl">{localizedService.name}</Card.Title>
      </div>
      <Card.Description>
        {localizedService.description}
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <Badge variant="secondary">{typeBadgeLabel}</Badge>
        {#if localizedService.provider}
          <Badge variant="outline">{localizedService.provider.name}</Badge>
        {:else if localizedService.author}
          <Badge variant="outline">{localizedService.author}</Badge>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>
</a>
