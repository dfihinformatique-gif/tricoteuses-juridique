<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeTexteVersionProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ texte_version: texteVersion } = data)

  $: summary = summarizeLegalObject(
    { key: "texte_version" },
    "texte_version",
    texteVersion,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>TEXTE_VERSION</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "texte_version" }}
  frame={false}
  open
  summarize={summarizeTexteVersionProperties}
  value={texteVersion}
/>
