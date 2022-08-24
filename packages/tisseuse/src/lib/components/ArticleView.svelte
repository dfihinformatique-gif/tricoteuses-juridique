<script lang="ts">
  import { SummaryView } from "augmented-data-viewer"

  import type { Aggregate } from "$lib/aggregates"
  import type { Article } from "$lib/legal"
  import { summarizeLegalObject } from "$lib/summaries"

  export let article: Article
  export let data: Aggregate
  export let level = 1

  $: summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

{#if summary !== undefined}
  <svelte:element this={`h${Math.min(level, 6)}`} class="text-lg font-bold">
    <SummaryView {summary} />
  </svelte:element>
{/if}

{@html article.BLOC_TEXTUEL.CONTENU}
