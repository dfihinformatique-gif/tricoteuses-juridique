<script lang="ts">
  import {
    auditEmptyToNull,
    auditOptions,
    auditSetNullish,
    auditString,
    auditTrimString,
    cleanAudit,
    type Audit,
  } from "@auditors/core"
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down"
  import SearchIcon from "@lucide/svelte/icons/search"

  import { goto } from "$app/navigation"
  import { page } from "$app/state"
  import { auditQuerySingleton } from "$lib/auditors/queries"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Command from "$lib/components/ui/command/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as InputGroup from "$lib/components/ui/input-group/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { possibleTypes, type PossibleType } from "./autocompletion.js"
  import { autocomplete } from "./autocompletion.remote.js"

  const auditQuery = (
    audit: Audit,
    query: URLSearchParams,
  ): [{ q: string; type?: PossibleType }, unknown] => {
    if (query == null) {
      return [query, null]
    }
    if (!(query instanceof URLSearchParams)) {
      return audit.unexpectedType(query, "URLSearchParams")
    }

    const data: { [key: string]: string[] } = {}
    for (const [key, value] of query.entries()) {
      let values = data[key]
      if (values === undefined) {
        values = data[key] = []
      }
      values.push(value)
    }
    const errors: { [key: string]: unknown } = {}
    const remainingKeys = new Set(Object.keys(data))

    audit.attribute(
      data,
      "q",
      true,
      errors,
      remainingKeys,
      auditQuerySingleton(auditString, auditSetNullish("")),
    )
    audit.attribute(
      data,
      "type",
      true,
      errors,
      remainingKeys,
      auditQuerySingleton(
        auditTrimString,
        auditEmptyToNull,
        auditOptions(possibleTypes),
      ),
    )

    return audit.reduceRemaining(
      data,
      errors,
      remainingKeys,
      auditSetNullish({}),
    )
  }

  let { q, type: typeFilter } = $state(
    auditQuery(cleanAudit, page.url.searchParams)[0],
  )
  let suggestions = $derived(await autocomplete([q, typeFilter ?? null]))

  const updateUrlSearchParams = (): void => {
    const params = [
      ["q", q || undefined],
      ["type", typeFilter],
    ].filter(([, value]) => value !== undefined) as Array<[string, string]>
    goto(params.length === 0 ? "" : `?${new URLSearchParams(params)}`, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    })
  }
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Tricoteuses
</h1>

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
            <DropdownMenu.RadioItem value=""><i>Tous</i></DropdownMenu.RadioItem
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
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group>
      {#each suggestions as { autocompletion, badge, date, id } (`${id}_${autocompletion}`)}
        {@const urlPath = urlPathFromId(id)}
        <Command.Item>
          {#if date !== undefined}
            <Badge variant="outline">{fullDateFormatter(date)}</Badge>
          {/if}
          {#if urlPath === null}
            {autocompletion}
          {:else}
            <a href={urlPath}>{autocompletion}</a>
          {/if}
          {#if badge !== undefined}
            <Badge variant="outline">{badge}</Badge>
          {/if}
        </Command.Item>
      {/each}
    </Command.Group>
  </Command.List>
</Command.Root>
