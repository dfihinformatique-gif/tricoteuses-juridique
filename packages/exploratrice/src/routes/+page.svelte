<script lang="ts">
  import {
    auditSetNullish,
    auditString,
    cleanAudit,
    type Audit,
  } from "@auditors/core"

  import { pushState } from "$app/navigation"
  import { auditQuerySingleton } from "$lib/auditors/queries"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Command from "$lib/components/ui/command/index.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { autocomplete } from "./autocompletion.remote.js"
  import { page } from "$app/state"

  const auditQuery = (
    audit: Audit,
    query: URLSearchParams,
  ): [{ q: string }, unknown] => {
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

    return audit.reduceRemaining(
      data,
      errors,
      remainingKeys,
      auditSetNullish({}),
    )
  }

  let { q } = $state(auditQuery(cleanAudit, page.url.searchParams)[0])
  let suggestions = $derived(await autocomplete(q))
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Tricoteuses
</h1>

<Command.Root shouldFilter={false}>
  <Command.Input
    placeholder="Nom de loi ou de projet de loi ou de JO…"
    bind:value={
      () => q,
      (value) => {
        q = value
        pushState(`?q=${encodeURIComponent(q)}`, {})
      }
    }
  />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group>
      {#each suggestions as { autocompletion, badge, id } (`${id}_${autocompletion}`)}
        {@const urlPath = urlPathFromId(id)}
        <Command.Item>
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
