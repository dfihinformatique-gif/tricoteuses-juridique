<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"

  import favicon from "$lib/assets/favicon.png"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js"
  import { Separator } from "$lib/components/ui/separator/index.js"

  import ModeSwitcher from "./mode-switcher.svelte"
</script>

<header class="sticky top-0 z-50 w-full bg-background">
  <div class="container-wrapper 3xl:fixed:px-0 px-6">
    <div
      class="3xl:fixed:container flex h-(--header-height) items-center gap-2 **:data-[slot=separator]:h-4"
    >
      <!-- <MobileNav class="flex lg:hidden" /> -->
      <Button
        class="hidden size-8 lg:flex"
        href="/"
        size="icon"
        variant="ghost"
      >
        <img alt="Logo des Tricoteuses" class="size-5" src={favicon} />
      </Button>
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>Tricoteuses</NavigationMenu.Trigger>
            <NavigationMenu.Content>
              <ul>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos"
                    target="_blank"
                    >À propos des Tricoteuses <ExternalLinkIcon
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/reunions.md"
                    target="_blank"
                    >Prochaines réunions <ExternalLinkIcon
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/FAQ.md"
                    target="_blank"
                    >Foire aux questions (FAQ) <ExternalLinkIcon
                    /></NavigationMenu.Link
                  >
                </li>
                <li>
                  <NavigationMenu.Link
                    class="flex flex-row whitespace-nowrap"
                    href="https://git.tricoteuses.fr/tricoteuses/a_propos/src/branch/main/mentions_legales.md"
                    target="_blank"
                    >Mentions légales <ExternalLinkIcon /></NavigationMenu.Link
                  >
                </li>
              </ul>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
      <div class="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
        <!-- <div class="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
					<CommandMenu {colors} />
				</div>
				<Separator orientation="vertical" class="ml-2 hidden lg:block" />
				<GithubLink /> -->
        <Separator orientation="vertical" />
        <ModeSwitcher />
      </div>
    </div>
  </div>
</header>
