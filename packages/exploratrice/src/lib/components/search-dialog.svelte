<script lang="ts">
  import { z } from "zod"
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"
  import SearchIcon from "@lucide/svelte/icons/search"
  import type { Component } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import { parseSearchParams, querySingleton, queryQ } from "$lib/zod/query.js"
  import { possibleTypes, type Suggestion } from "$lib/autocompletion.js"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Command from "$lib/components/ui/command/index.js"
  import * as Dialog from "$lib/components/ui/dialog/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as InputGroup from "$lib/components/ui/input-group/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { useModifierKeyPrefix } from "$lib/hooks/use-modifier-key-prefix.svelte.js"
  import { searchContext } from "$lib/hooks/search-context.svelte.js"
  import { autocomplete } from "$lib/autocompletion.remote.js"
  import { urlPathFromId } from "$lib/urls.js"
  import { cn } from "$lib/utils.js"

  // Define the query schema for search parameters
  const SearchQuerySchema = z.object({
    q: queryQ(),
    type: querySingleton(
      z
        .string()
        .trim()
        .transform((val) => (val === "" ? undefined : val))
        .pipe(z.enum(possibleTypes).optional()),
    ),
  })

  type SearchQuery = z.infer<typeof SearchQuerySchema>

  const parseQuery = (query: URLSearchParams): SearchQuery => {
    const data = parseSearchParams(query)
    const result = SearchQuerySchema.safeParse(data)

    if (result.success) {
      return result.data
    }

    // Return default values on parse error
    return { q: undefined, type: undefined }
  }

  let { q, type: typeFilter } = $state(parseQuery(page.url.searchParams))
  const modifierKeyPrefix = useModifierKeyPrefix()
  let open = $derived(q !== undefined || typeFilter !== undefined)
  const sampleSearches = [
    "loi informatique et libertés",
    "article 204 A du code général des impôts",
    "JORF du 5 octobre 1958",
    "projet de loi de finances pour 2026",
    "JORFTEXT000000571356",
  ]
  let suggestions = $derived(
    await autocomplete([
      q ?? null,
      typeFilter ?? null,
      searchContext.legifranceTexteCid,
    ]),
  )

  const updateUrlSearchParams = (): void => {
    const params = [
      ["q", q],
      ["type", typeFilter],
    ].filter(([, value]) => value !== undefined) as Array<[string, string]>
    goto(params.length === 0 ? "." : `?${new URLSearchParams(params)}`, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    })
  }
</script>

{#snippet commandMenuKbd({
  class: className,
  content,
  ...restProps
}: HTMLAttributes<HTMLElement> & { content: string | Component })}
  {@const Content = content}
  <kbd
    class={cn(
      "pointer-events-none flex h-5 items-center justify-center gap-1 rounded border bg-background px-1 font-sans text-[0.7rem] font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3",
      className,
    )}
    {...restProps}
  >
    {#if typeof Content === "string"}
      {Content}
    {:else}
      <Content />
    {/if}
  </kbd>
{/snippet}

{#snippet suggestionView({ autocompletion, badge, date }: Suggestion)}
  {#if date !== undefined}
    <Badge variant="outline">{fullDateFormatter(date)}</Badge>
  {/if}
  {autocompletion}
  {#if badge !== undefined}
    <Badge variant="outline">{badge}</Badge>
  {/if}
{/snippet}

<Dialog.Root
  bind:open={
    () => open,
    (value) => {
      open = value
      if (!open) {
        // Remove search parameters from URL search parameters.
        const { url } = page
        const { searchParams } = url
        let searchParamsModified = false
        for (const key of ["q", "type"]) {
          if (searchParams.has(key)) {
            searchParams.delete(key)
            searchParamsModified = true
          }
        }
        console.log(searchParamsModified, searchParams, searchParams.toString())
        if (searchParamsModified) {
          const search = searchParams.toString()
          // Don't await goto.
          goto(`${url.pathname}${search ? `?${search}` : ""}`, {
            keepFocus: true,
            noScroll: true,
          })
        }
      }
    }
  }
>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="secondary"
        class={cn(
          "bg-surface text-surface-foreground/60 relative h-8 w-full justify-start pl-2.5 font-normal shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64 dark:bg-card",
        )}
        onclick={() => (open = true)}
      >
        <span class="hidden lg:inline-flex">Recherche de législation…</span>
        <span class="inline-flex lg:hidden">Recherche…</span>
        <div class="absolute top-1.5 right-1.5 hidden gap-1 sm:flex">
          {@render commandMenuKbd({ content: modifierKeyPrefix.current })}
          {@render commandMenuKbd({ content: "K", class: "aspect-square" })}
        </div>
      </Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-full md:max-w-6xl">
    <Dialog.Header>
      <Dialog.Title>Recherche de documents législatifs</Dialog.Title>
      <Dialog.Description>
        <section class="my-4 space-y-1">
          <p>
            Tapez les premiers caractères d'un texte législatif ou collez une
            référence ou un identifiant.
          </p>

          <p class="italic">
            <b>Exemples</b> : {#each sampleSearches as sampleSearch, i}{i === 0
                ? ""
                : ", "}<a
                class="link"
                data-sveltekit-reload
                href="/?q={encodeURIComponent(sampleSearch)}">{sampleSearch}</a
              >{/each}…
          </p>
        </section>
      </Dialog.Description>
    </Dialog.Header>

    <Command.Root shouldFilter={false}>
      <InputGroup.Root class="[--radius:1rem]">
        <InputGroup.Input
          placeholder="Nom de loi ou de projet de loi ou de JO…"
          bind:value={
            () => q,
            (value) => {
              q = value
              updateUrlSearchParams()
            }
          }
        />
        <InputGroup.Addon>
          <SearchIcon />
        </InputGroup.Addon>
        <InputGroup.Addon align="inline-end">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <InputGroup.Button
                  {...props}
                  variant="ghost"
                  class="pr-1.5! text-xs"
                >
                  {typeFilter === undefined ? "Chercher dans…" : typeFilter}
                  <ChevronDownIcon class="size-3" />
                </InputGroup.Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="[--radius:0.95rem]">
              <DropdownMenu.RadioGroup
                bind:value={
                  () => typeFilter ?? "",
                  (value) => {
                    typeFilter = value || undefined
                    updateUrlSearchParams()
                  }
                }
              >
                <DropdownMenu.RadioItem value=""
                  ><i>Tous</i></DropdownMenu.RadioItem
                >
                <DropdownMenu.Separator />
                {#each possibleTypes as possibleType}
                  <DropdownMenu.RadioItem value={possibleType}
                    >{possibleType}</DropdownMenu.RadioItem
                  >
                {/each}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </InputGroup.Addon>
      </InputGroup.Root>
      <Command.List>
        <Command.Empty>Aucun résultat trouvé.</Command.Empty>
        <Command.Group>
          {#each suggestions as suggestion (`${suggestion.id}_${suggestion.autocompletion}`)}
            {@const urlPath = urlPathFromId(suggestion.id)}
            <Command.Item>
              {#if urlPath === undefined}
                {@render suggestionView(suggestion)}
              {:else}
                <a data-sveltekit-reload href={urlPath}
                  >{@render suggestionView(suggestion)}</a
                >
              {/if}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>
