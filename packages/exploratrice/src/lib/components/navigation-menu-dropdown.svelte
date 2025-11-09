<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"
  import type { Snippet } from "svelte"

  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte"

  import { cn } from "$lib/utils.js"

  let { children, trigger }: { children: Snippet; trigger: string } = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class={cn(navigationMenuTriggerStyle(), "group")}>
    {trigger}
    <ChevronDownIcon
      class="relative top-px ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    {@render children()}
  </DropdownMenu.Content>
</DropdownMenu.Root>
