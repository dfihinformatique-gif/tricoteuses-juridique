<script lang="ts">
  import { iterArrayOrSingleton } from "@tricoteuses/explorer-tools"
  import { SummaryView } from "augmented-data-viewer"

  import type { Aggregate } from "$lib/aggregates"
  import ArticleView from "$lib/components/ArticleView.svelte"
  import { pathnameFromLegalId, type SectionTa } from "$lib/legal"
  import { summarizeLegalObject } from "$lib/summaries"

  export let data: Aggregate
  export let level = 1
  export let sectionTa: SectionTa
  export let showArticles: boolean

  $: summary = summarizeLegalObject(
    { key: "section_ta" },
    "section_ta",
    sectionTa,
  )
</script>

<svelte:element this={`h${Math.min(level, 6)}`} class="text-1xl font-extrabold">
  {sectionTa.TITRE_TA}
</svelte:element>

<div class="ml-4">
  {#if showArticles}
    {#each [...iterArrayOrSingleton(sectionTa.STRUCTURE_TA.LIEN_ART)] as lienArt}
      {@const article = data.article?.[lienArt["@id"]]}
      {#if article !== undefined}
        <ArticleView {article} {data} level={level + 1} />
      {/if}
    {/each}
  {:else if sectionTa.STRUCTURE_TA.LIEN_ART !== undefined}
    <ul class="inline">
      {#each [...iterArrayOrSingleton(sectionTa.STRUCTURE_TA.LIEN_ART)] as lienArt}
        <li class="inline after:content-[',_'] after:last:content-['']">
          <a
            class="link-hover link-primary link"
            href={pathnameFromLegalId(lienArt["@id"])}
          >
            Article {lienArt["@num"]}
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  {#each [...iterArrayOrSingleton(sectionTa.STRUCTURE_TA.LIEN_SECTION_TA)] as lienSectionTa}
    {@const sectionTa = data.section_ta?.[lienSectionTa["@id"]]}
    {#if sectionTa !== undefined}
      <svelte:self {data} level={level + 1} {sectionTa} {showArticles} />
    {/if}
  {/each}
</div>
