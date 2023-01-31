<script lang="ts">
  import { iterArrayOrSingleton } from "@tricoteuses/explorer-tools"

  import type { Aggregate } from "$lib/aggregates"
  import ArticleView from "$lib/components/ArticleView.svelte"
  import SectionTaView from "$lib/components/SectionTaView.svelte"
  import { pathnameFromLegalId, type Textelr } from "$lib/legal"

  export let data: Aggregate
  export let level = 1
  export let showArticles: boolean
  export let textelr: Textelr
</script>

{#if showArticles}
  {#each [...iterArrayOrSingleton(textelr.STRUCT.LIEN_ART)] as lienArt}
    {@const article = data.article?.[lienArt["@id"]]}
    {#if article !== undefined}
      <ArticleView {article} {data} level={level + 1} />
    {/if}
  {/each}
{:else if textelr.STRUCT.LIEN_ART !== undefined}
  <ul class="inline">
    {#each [...iterArrayOrSingleton(textelr.STRUCT.LIEN_ART)] as lienArt}
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

{#each [...iterArrayOrSingleton(textelr.STRUCT.LIEN_SECTION_TA)] as lienSectionTa}
  {@const sectionTa = data.section_ta?.[lienSectionTa["@id"]]}
  {#if sectionTa !== undefined}
    <SectionTaView {data} level={level + 1} {sectionTa} {showArticles} />
  {/if}
{/each}
