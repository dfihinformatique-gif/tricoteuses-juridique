<script lang="ts">
  import { iterArrayOrSingleton } from "@tricoteuses/explorer-tools"
  import { SummaryView } from "augmented-data-viewer"

  import type { Aggregate } from "$lib/aggregates.js"
  import LienView from "$lib/components/LienView.svelte"
  import type { Article } from "$lib/legal/index.js"
  import { summarizeLegalObject } from "$lib/summaries.js"

  export let article: Article
  export let data: Aggregate
  export let level = 1

  $: liens = [...iterArrayOrSingleton(article.LIENS?.LIEN)]
  $: ciblesCreation = liens.filter(
    (lien) => lien["@sens"] === "cible" && lien["@typelien"] === "CREATION",
  )
  $: summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

{#if summary !== undefined}
  <svelte:element
    this={`h${Math.min(level, 6)}`}
    class="my-4 text-lg font-bold"
  >
    <SummaryView {summary} />
  </svelte:element>
{/if}

{@html article.BLOC_TEXTUEL?.CONTENU.replaceAll("<<", "«").replaceAll(
  ">>",
  "»",
)}

{#if ciblesCreation.length > 0}
  <ul>
    {#each liens as lien}
      <li>
        <LienView {data} level={level + 1} {lien} />
      </li>
    {/each}
  </ul>
{/if}
