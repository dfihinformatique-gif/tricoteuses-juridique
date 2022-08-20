<script lang="ts">
  import Icon from "@iconify/svelte"
  import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  import { page } from "$app/stores"
  import Pagination from "$lib/components/Pagination.svelte"
  import { summarizeArticleProperties } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ articles, q } = data)
</script>

<header class="prose my-6 max-w-full">
  <h1>Recherche</h1>
</header>

<form action={$page.url.pathname} class="mx-auto max-w-sm" method="get">
  <div class="form-control">
    <div class="input-group">
      <input
        class="input input-bordered"
        name="q"
        type="search"
        bind:value={q}
      />
      <button class="btn btn-square" type="submit">
        <Icon icon={searchIcon} />
      </button>
    </div>
  </div>
</form>

{#if q !== undefined}
  {#if articles === undefined}
    <p>Aucun article trouvé</p>
  {:else}
    <TreeView
      access={{ key: "articles" }}
      frame={false}
      open
      summarize={summarizeArticleProperties}
      value={articles}
    />

    <Pagination currentPageCount={articles.length ?? 0} />
  {/if}
{/if}
