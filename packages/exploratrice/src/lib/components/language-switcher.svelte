<script lang="ts">
  import { page } from "$app/stores"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as m from "$lib/paraglide/messages.js"
  import { locales } from "$lib/paraglide/runtime.js"
  import Languages from "@lucide/svelte/icons/languages"

  const languageNames: Record<string, string> = {
    fr: "Français",
    en: "English",
  }

  function switchLanguage(locale: string) {
    const url = new URL($page.url)
    const segments = url.pathname.split("/").filter(Boolean)

    // Remove current locale if it exists
    if (locales.includes(segments[0] as any)) {
      segments.shift()
    }

    // Add new locale if not default (fr)
    if (locale !== "fr") {
      segments.unshift(locale)
    }

    url.pathname = "/" + segments.join("/")
    window.location.href = url.toString()
  }

  // Derive current language from URL
  const currentLang = $derived.by(() => {
    const segments = $page.url.pathname.split("/").filter(Boolean)
    const firstSegment = segments[0]
    // Check if first segment is a locale
    if (locales.includes(firstSegment as any)) {
      return firstSegment
    }
    // Default to base locale (fr)
    return "fr"
  })
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" {...props}>
        <Languages class="h-5 w-5" />
        <span class="sr-only">{m.language_switch()}</span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    {#each locales as lang}
      <DropdownMenu.Item
        onclick={() => switchLanguage(lang)}
        class={currentLang === lang ? "bg-accent" : ""}
      >
        {languageNames[lang] || lang}
        {#if currentLang === lang}
          <span class="ml-2">✓</span>
        {/if}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
