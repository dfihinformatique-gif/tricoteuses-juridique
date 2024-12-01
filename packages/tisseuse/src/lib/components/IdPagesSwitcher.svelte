<script lang="ts">
  import { page } from "$app/stores"
  import * as Tabs from "$lib/components/ui/tabs"
  import { menuItemsFromLegalId } from "$lib/legal"

  export let id: string | undefined | null

  $: items = menuItemsFromLegalId(id)

  $: pathname = $page.url.pathname
</script>

{#if items !== undefined}
  <Tabs.Root value={pathname}>
    <Tabs.List>
      {#each items as { href, label }}
        <Tabs.Trigger value={href!}>
          {#snippet child({ props })}
            <a {href} {...props}>{label}</a>
          {/snippet}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
{/if}
