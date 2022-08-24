<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import {
    summarizeTextelrProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ textelr: textelr } = data)

  $: summary = summarizeLegalObject({ key: "textelr" }, "textelr", textelr)
</script>

<IdPagesSwitcher id={textelr.META.META_COMMUN.ID} />

<header class="prose my-6 max-w-full">
  <h2>TEXTELR</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "textelr" }}
  frame={false}
  open
  summarize={summarizeTextelrProperties}
  value={textelr}
/>
