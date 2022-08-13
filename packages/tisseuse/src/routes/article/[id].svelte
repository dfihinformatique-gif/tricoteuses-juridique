<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Article } from "$lib/data"
  import {
    summarizeArticleProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  export let article: Article

  const summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

<header class="prose my-6 max-w-full">
  <h2>ARTICLE</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

{#if error != null}
  <ErrorAlert {error} />
{/if}

{#if error == null}
  <TreeView
    access={{ key: "article" }}
    frame={false}
    open
    summarize={summarizeArticleProperties}
    value={article}
  />
{/if}
