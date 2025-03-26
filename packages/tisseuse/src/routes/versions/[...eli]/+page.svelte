<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeVersionsWrapperProperties,
    summarizeLegalObject,
  } from "$lib/summaries.js"

  import type { PageData } from "./$types.js"

  export let data: PageData

  $: ({ versions: versionsWrapper } = data)

  $: summary = summarizeLegalObject(
    { key: "versions" },
    "versions",
    versionsWrapper,
  )
</script>

<header class="my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    VERSIONS
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
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
