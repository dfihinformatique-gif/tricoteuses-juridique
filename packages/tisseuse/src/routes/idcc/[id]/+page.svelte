<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import { summarizeIdccProperties, summarizeLegalObject } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ idcc } = data)

  $: summary = summarizeLegalObject({ key: "idcc" }, "idcc", idcc)
</script>

<header class="prose my-6 max-w-full">
  <h2>IDCC</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "idcc" }}
  frame={false}
  open
  summarize={summarizeIdccProperties}
  value={idcc}
/>
