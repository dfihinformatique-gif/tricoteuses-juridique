<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import SearchIcon from "@lucide/svelte/icons/search"

  import { Button } from "$lib/components/ui/button/index.js"
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js"
  import { Separator } from "$lib/components/ui/separator/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"

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
            <NavigationMenu.Trigger>Tricoteuses</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul>
                <li>
                  <NavigationMenu.Link href="/">Accueil</NavigationMenu.Link>
                </li>
                <li>
                  <NavigationMenu.Link href="/services"
                    >Services et données</NavigationMenu.Link
                  >
                </li>
                <li class="border-b">
                  <NavigationMenu.Link href="/reuses"
                    >Réutilisations</NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos"
                    target="_blank"
                    >À propos des Tricoteuses <ExternalLinkIcon
                      class="ml-1"
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/reunions.md"
                    target="_blank"
                    >Prochaines réunions <ExternalLinkIcon
                      class="ml-1"
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/FAQ.md"
                    target="_blank"
                    >Foire aux questions (FAQ) <ExternalLinkIcon
                      class="ml-1"
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/mentions_legales.md"
                    target="_blank"
                    >Mentions légales <ExternalLinkIcon
                      class="ml-1"
                    /></NavigationMenu.Link
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
          href="/recherche"
          class="hidden md:inline-flex"
        >
          <SearchIcon class="mr-2 h-4 w-4" />
          Recherche
        </Button>
        <Separator orientation="vertical" />
        <ModeSwitcher />
      </div>
    </div>
  </div>
</header>
