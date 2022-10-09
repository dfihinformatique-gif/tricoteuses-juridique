<script lang="ts">
  import { cleanAudit } from "@auditors/core"

  import { page } from "$app/stores"
  import { auditPaginationQuery } from "$lib/auditors/queries"
  import type { PaginationQuery } from "$lib/queries"
  import { urlFromUrlAndQuery } from "$lib/urls"

  export let count: number | undefined | null = undefined // Count is not always known.
  export let currentPageCount: number

  $: url = $page.url

  $: query = ensureValidQuery(url.searchParams)

  $: limit = query.limit

  $: offset = query.offset

  $: pathname = url.pathname

  function ensureValidQuery(query: URLSearchParams): PaginationQuery {
    const [validQuery, queryError] = auditPaginationQuery(
      cleanAudit,
      query,
    ) as [PaginationQuery, unknown]
    if (queryError !== null) {
      console.warn(
        `Query error at ${pathname}: ${JSON.stringify(
          queryError,
          null,
          2,
        )}\n\n${JSON.stringify(validQuery, null, 2)}`,
      )
      return { limit: 20, offset: 0 }
    }
    return validQuery
  }

  function newPaginationUrl(
    pathname: string,
    query:
      | Partial<PaginationQuery>
      | {
          [key: string]:
            | boolean
            | number
            | string
            | undefined
            | null
            | Iterable<boolean | number | string | undefined | null>
        },
    { limit, offset }: { limit?: number; offset?: number } = {},
  ) {
    query = { ...query }
    if (limit != null && limit !== 20) {
      query.limit = limit
    } else {
      delete query.limit
    }
    if (offset) {
      query.offset = offset
    } else {
      delete query.offset
    }
    return urlFromUrlAndQuery(pathname, query)
  }

  function pageNumber(limit: number, offset: number): number {
    return Math.floor(offset / limit) + 1
  }
</script>

<div class="my-4 flex items-baseline justify-evenly">
  <p class="mr-4">
    {#if currentPageCount === 0}
      Aucun résultat
    {:else}
      Résultats {offset + 1} à {offset + currentPageCount}{#if count != null}
        sur {count}{/if}
    {/if}
  </p>
  <div class="btn-group">
    {#if offset > 0}
      <a
        class="btn btn-outline"
        href={newPaginationUrl(pathname, query, {
          offset: Math.max(offset - limit, 0),
        })}
      >
        Précédent
      </a>
    {:else}
      <span class="btn btn-disabled">Précédent</span>
    {/if}
    {#each [offset - 3 * limit, offset - 2 * limit, offset - limit] as previousOffset (previousOffset)}
      {#if previousOffset >= 0 && (count == null || previousOffset < count)}
        <a
          class="btn btn-outline"
          href={newPaginationUrl(pathname, query, { offset: previousOffset })}
        >
          {pageNumber(limit, previousOffset)}
        </a>
      {/if}
    {/each}
    <span class="btn btn-disabled">
      {pageNumber(limit, offset)}
      <span class="sr-only">(page actuelle)</span>
    </span>
    {#each [offset + limit, offset + 2 * limit, offset + 3 * limit] as nextOffset (nextOffset)}
      {#if nextOffset >= 0 && (count == null || nextOffset < count)}
        <a
          class="btn btn-outline"
          href={newPaginationUrl(pathname, query, { offset: nextOffset })}
        >
          {pageNumber(limit, nextOffset)}
        </a>
      {/if}
    {/each}
    {#if count == null || offset + limit < count}
      <a
        class="btn btn-outline"
        href={newPaginationUrl(pathname, query, { offset: offset + limit })}
        >Suivant</a
      >
    {:else}
      <span class="btn btn-disabled">Suivant</span>
    {/if}
  </div>
</div>
