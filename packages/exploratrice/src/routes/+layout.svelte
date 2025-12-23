<script lang="ts">
  import "../app.css"

  import { ModeWatcher } from "mode-watcher"

  import favicon from "$lib/assets/favicon.png"
  import SiteHeader from "$lib/components/site-header.svelte"

  let { children } = $props()
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<SiteHeader />

<main class="container mx-auto px-6">
  {@render children?.()}
</main>
