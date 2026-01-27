<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import SearchIcon from "@lucide/svelte/icons/search"

  import { Button } from "$lib/components/ui/button/index.js"
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js"
  import { Separator } from "$lib/components/ui/separator/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { localizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import LanguageSwitcher from "./language-switcher.svelte"
  import ModeSwitcher from "./mode-switcher.svelte"
</script>

<!-- Use a z-index higher than those of Assemblée "pastillages". -->
<header class="sticky top-0 z-999999 mb-6 border-b bg-background py-5">
  <div class="3xl:fixed:px-0 container mx-auto px-6">
    <div
      class="3xl:fixed:container flex h-(--header-height) items-center gap-2 **:data-[slot=separator]:h-4"
    >
      <!-- <MobileNav class="flex lg:hidden" /> -->
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item openOnHover={false}>
            <NavigationMenu.Trigger>{m.site_name()}</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul>
                <li>
                  <NavigationMenu.Link href={localizedHref("/")}
                    >{m.nav_home()}</NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link href={localizedHref("/services")}
                    >{m.nav_services()}</NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link href={localizedHref("/reutilisations")}
                    >{m.nav_reuses()}</NavigationMenu.Link
                  >
                </li>
                <li class="border-b">
                  <NavigationMenu.Link href={localizedHref("/a_propos")}
                    >{m.nav_about()}</NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/reunions.md"
                    target="_blank"
                    >{m.nav_upcoming_meetings()}
                    <ExternalLinkIcon class="ml-1" /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/FAQ.md"
                    target="_blank"
                    >{m.nav_faq()}
                    <ExternalLinkIcon class="ml-1" /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/mentions_legales.md"
                    target="_blank"
                    >{m.nav_legal_notices()}
                    <ExternalLinkIcon class="ml-1" /></NavigationMenu.Link
                  >
                </li>
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          {#if mainMenu.pageSpecificMenuItem !== undefined}
            {@render mainMenu.pageSpecificMenuItem()}
          {/if}
        </NavigationMenu.List>
      </NavigationMenu.Root>
      <div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
        <Button
          variant="secondary"
          href={localizedHref("/recherche")}
          class="hidden md:inline-flex"
        >
          <SearchIcon class="mr-2 h-4 w-4" />
          {m.nav_search()}
        </Button>
        <Separator orientation="vertical" />
        <LanguageSwitcher />
        <ModeSwitcher />
      </div>
    </div>
  </div>
</header>
