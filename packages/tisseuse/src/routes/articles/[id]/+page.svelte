<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ArticleView from "$lib/components/ArticleView.svelte"
  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import type { Article } from "$lib/legal"
  import {
    summarizeAggregateProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  let showRawData = false

  $: id = data.id
  $: article = (data.article as { [articleId: string]: Article })[id]

  $: summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

<IdPagesSwitcher {id} />

<header class="prose my-6 max-w-full">
  <h2>Articles</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<form class="max-w-xs" on:submit|preventDefault>
  <div class="form-control">
    <label class="label cursor-pointer">
      <span class="label-text">Données brutes</span>
      <input class="toggle" type="checkbox" bind:checked={showRawData} />
    </label>
  </div>
</form>

{#if showRawData}
  <TreeView
    frame={false}
    open
    summarize={summarizeAggregateProperties}
    value={data}
  />
{:else}
  <ArticleView {article} {data} />
{/if}
