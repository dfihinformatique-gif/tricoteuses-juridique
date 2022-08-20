<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeVersionsWrapperProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ versions: versionsWrapper } = data)

  $: summary = summarizeLegalObject(
    { key: "versions" },
    "versions",
    versionsWrapper,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>VERSIONS</h2>
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
  summarize={summarizeVersionsWrapperProperties}
  value={versionsWrapper}
/>
