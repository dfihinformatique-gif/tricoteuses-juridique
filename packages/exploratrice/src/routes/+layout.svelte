<script lang="ts">
  import { page } from "$app/state"
  import { locales, localizeHref, deLocalizeUrl } from "$lib/paraglide/runtime"
  import "../app.css"
  import { ModeWatcher } from "mode-watcher"
  import favicon from "$lib/assets/favicon.png"
  import SiteHeader from "$lib/components/site-header.svelte"
  import NextMeetingAlertCompact from "$lib/components/next-meeting-alert-compact.svelte"

  let { children, data } = $props()

  // Get pathname without locale prefix for route checking
  const delocalizedPathname = $derived(deLocalizeUrl(page.url).pathname)
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<SiteHeader />

<main class="container mx-auto px-6">
  {#if data.nextMeeting && delocalizedPathname !== "/" && !delocalizedPathname.startsWith("/reunions")}
    <NextMeetingAlertCompact meeting={data.nextMeeting} />
  {/if}
  {@render children?.()}
</main>
<div style="display:none">
  {#each locales as locale}
    <a href={localizeHref(page.url.pathname, { locale })}>
      {locale}
    </a>
  {/each}
</div>
