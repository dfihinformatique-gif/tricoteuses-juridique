<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeArticleProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ article } = data)

  $: summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

<header class="prose my-6 max-w-full">
  <h2>ARTICLE</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "article" }}
  frame={false}
  open
  summarize={summarizeArticleProperties}
  value={article}
/>
