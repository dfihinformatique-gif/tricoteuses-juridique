<script lang="ts">
  import { SummaryView } from "augmented-data-viewer"

  import type { Aggregate } from "$lib/aggregates.js"
  import TextelrView from "$lib/components/TextelrView.svelte"
  import type { TexteVersion } from "$lib/legal/index.js"
  import { summarizeLegalObject } from "$lib/summaries.js"

  export let data: Aggregate
  export let level = 1
  export let showArticles: boolean
  export let texteVersion: TexteVersion

  $: id = texteVersion.META.META_COMMUN.ID

  $: textelr = data.textekali?.[id] ?? data.textelr?.[id]

  $: summary = summarizeLegalObject(
    { key: "texte_version" },
    "texte_version",
    texteVersion,
  )
</script>

{#if summary !== undefined}
  <svelte:element
    this={`h${Math.min(level, 6)}`}
    class="text-4xl font-extrabold"
  >
    <SummaryView {summary} />
  </svelte:element>
{/if}

{#if textelr !== undefined}
  <TextelrView {data} {level} {showArticles} {textelr} />
{/if}
