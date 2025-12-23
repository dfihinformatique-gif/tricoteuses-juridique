<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"

  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js"
  import { Separator } from "$lib/components/ui/separator/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"

  import ModeSwitcher from "./mode-switcher.svelte"
  import SearchDialog from "./search-dialog.svelte"
</script>

<header class="sticky top-0 z-50 mb-6 border-b bg-background py-5">
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
                <li class="border-b">
                  <NavigationMenu.Link href="/">Accueil</NavigationMenu.Link>
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
        <div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
          <SearchDialog />
        </div>
        <Separator orientation="vertical" />
        <ModeSwitcher />
      </div>
    </div>
  </div>
</header>
