<script lang="ts">
  import Search from "@lucide/svelte/icons/search"
  import { TreeView } from "augmented-data-viewer"

  import { page } from "$app/stores"
  // import Pagination from "$lib/components/Pagination.svelte"
  import { summarizeArticleProperties } from "$lib/summaries.js"

  import type { PageData } from "./$types.js"

  export let data: PageData

  $: id = data.id
  $: q = data.q
  $: article = id === undefined ? undefined : data.article?.[id]
</script>

<header class="my-6 max-w-full">
  <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
    Recherche
  </h1>
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
        <Search />
      </button>
    </div>
  </div>
</form>

{#if q !== undefined}
  {#if article === undefined}
    <p>Aucun article trouvé</p>
  {:else}
    <TreeView
      access={{ key: "articles" }}
      frame={false}
      open
      summarize={summarizeArticleProperties}
      value={article}
    />

    <!-- <Pagination currentPageCount={article.length ?? 0} /> -->
  {/if}
{/if}
