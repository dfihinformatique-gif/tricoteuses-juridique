<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import {
    summarizeTextelrProperties,
    summarizeLegalObject,
  } from "$lib/summaries.js"

  import type { PageData } from "./$types.js"

  export let data: PageData

  $: ({ textelr: textelr } = data)

  $: summary = summarizeLegalObject({ key: "textelr" }, "textelr", textelr)
</script>

<IdPagesSwitcher id={textelr.META.META_COMMUN.ID} />

<header class="my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    TEXTELR
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
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
