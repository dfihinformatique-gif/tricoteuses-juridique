<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeIdWrapperProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ id: idWrapper } = data)

  $: summary = summarizeLegalObject({ key: "id" }, "id", idWrapper)
</script>

<header class="prose my-6 max-w-full">
  <h2>ID</h2>
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
  summarize={summarizeIdWrapperProperties}
  value={idWrapper}
/>
