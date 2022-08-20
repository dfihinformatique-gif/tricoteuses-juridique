<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import { summarizeJoProperties, summarizeLegalObject } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ jo } = data)

  $: summary = summarizeLegalObject({ key: "jo" }, "jo", jo)
</script>

<header class="prose my-6 max-w-full">
  <h2>JO</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "jo" }}
  frame={false}
  open
  summarize={summarizeJoProperties}
  value={jo}
/>
