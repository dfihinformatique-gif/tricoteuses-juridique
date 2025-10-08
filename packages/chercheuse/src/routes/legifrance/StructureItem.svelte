<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right"
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import { Collapsible, type WithoutChild } from "bits-ui"
  import type { Snippet } from "svelte"

  import type { Pathname } from "$app/types"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
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
                class="pointer-events-none mr-1 size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200"
              />
            {:else}
              <ChevronRightIcon
                class="pointer-events-none mr-1 size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200"
              />
            {/if}
            {@render heading()}
          </Item.Title>
        </Item.Content>
        {#if pathname !== null}
          <Item.Actions>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                ><EllipsisVerticalIcon
                  class="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                /></DropdownMenu.Trigger
              >
              <DropdownMenu.Content align="end">
                <DropdownMenu.Group>
                  <DropdownMenu.Item>
                    <a class="h-full w-full" href={pathname}>Voir à part</a>
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Item.Actions>
        {/if}
      </Item.Root>
    {/snippet}
  </Collapsible.Trigger>
  <Collapsible.Content>
    {@render children?.()}
  </Collapsible.Content>
</Collapsible.Root>
