<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import {
    summarizeTextekaliProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ textekali } = data)

  $: summary = summarizeLegalObject(
    { key: "textekali" },
    "textekali",
    textekali,
  )
</script>

<IdPagesSwitcher id={textekali.META.META_COMMUN.ID} />

<header class="prose my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    TEXTEKALI
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "textekali" }}
  frame={false}
  open
  summarize={summarizeTextekaliProperties}
  value={textekali}
/>
