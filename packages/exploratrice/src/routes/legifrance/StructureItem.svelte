<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right"
  import EyeIcon from "@lucide/svelte/icons/eye"
  import { Collapsible, type WithoutChild } from "bits-ui"
  import type { Snippet } from "svelte"

  import type { Pathname } from "$app/types"
  import * as Item from "$lib/components/ui/item/index.js"

  type Props = WithoutChild<Collapsible.RootProps> & {
    heading: Snippet<[]>
    pathname: Pathname | null
  }

  let {
    children,
    heading,
    open = $bindable(false),
    pathname,
    ref = $bindable(null),
    ...restProps
  }: Props = $props()
</script>

<Collapsible.Root bind:open bind:ref {...restProps}>
  <Collapsible.Trigger>
    {#snippet child({ props })}
      <Item.Root class="cursor-pointer p-0" {...props}>
        <Item.Content>
          <Item.Title class="text-base">
            {#if open}
              <ChevronDownIcon
                class="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200"
              />
            {:else}
              <ChevronRightIcon
                class="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200"
              />
            {/if}
            {@render heading()}
            {#if pathname !== null}
              <Item.Actions>
                <a class="h-full w-full" href={pathname} title="Voir à part"
                  ><EyeIcon
                    class="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                  /></a
                >
              </Item.Actions>
            {/if}
          </Item.Title>
        </Item.Content>
      </Item.Root>
    {/snippet}
  </Collapsible.Trigger>
  <Collapsible.Content>
    {@render children?.()}
  </Collapsible.Content>
</Collapsible.Root>
