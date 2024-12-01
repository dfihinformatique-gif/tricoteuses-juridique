<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeSectionTaProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ section_ta: sectionTa } = data)

  $: summary = summarizeLegalObject(
    { key: "section_ta" },
    "section_ta",
    sectionTa,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    SECTION_TA
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "section_ta" }}
  frame={false}
  open
  summarize={summarizeSectionTaProperties}
  value={sectionTa}
/>
