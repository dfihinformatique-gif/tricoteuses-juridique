<script lang="ts">
  import "../app.postcss"

  // import { NavBar } from "@tricoteuses/explorer-tools"
  import NavBar from "@tricoteuses/explorer-tools/components/NavBar.svelte"

  import { page } from "$app/stores"
  import { appMenu } from "$lib/legal"
</script>

<svelte:head>
  <title>{$page.data.appTitle}</title>
</svelte:head>

<NavBar
  contributeUrl="https://git.en-root.org/tricoteuses/tricoteuses-legal-explorer"
  leftMenu={appMenu}
  title={$page.data.appTitle}
  url={$page.url.origin}
/>

<div class="mx-auto w-11/12">
  <slot />
</div>
