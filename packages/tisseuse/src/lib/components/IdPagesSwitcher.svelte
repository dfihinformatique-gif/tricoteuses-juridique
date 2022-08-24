<script lang="ts">
  import { page } from "$app/stores"
  import { menuItemsFromLegalId } from "$lib/legal"

  export let id: string | undefined | null

  $: items = menuItemsFromLegalId(id)

  $: pathname = $page.url.pathname
</script>

{#if items !== undefined}
  <div class="tabs">
    {#each items as { href, label }}
      <a class="tab tab-bordered" class:tab-active={href === pathname} {href}
        >{label}</a
      >
    {/each}
  </div>
{/if}
