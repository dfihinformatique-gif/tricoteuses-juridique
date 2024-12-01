<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
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

<IdPagesSwitcher id={texteVersion.META.META_COMMUN.ID} />

<header class="prose my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    TEXTE_VERSION
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
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
