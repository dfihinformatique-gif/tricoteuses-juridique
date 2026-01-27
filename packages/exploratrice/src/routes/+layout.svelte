<script lang="ts">
  import { page } from "$app/state"
  import { locales, localizeHref } from "$lib/paraglide/runtime"
  import "../app.css"
  import { ModeWatcher } from "mode-watcher"
  import favicon from "$lib/assets/favicon.png"
  import SiteHeader from "$lib/components/site-header.svelte"

  let { children } = $props()
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<SiteHeader />

<main class="container mx-auto px-6">{@render children?.()}</main>
<div style="display:none">
  {#each locales as locale}
    <a href={localizeHref(page.url.pathname, { locale })}>
      {locale}
    </a>
  {/each}
</div>
