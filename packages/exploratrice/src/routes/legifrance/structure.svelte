<script lang="ts">
  import {
    type JorfSectionTa,
    type JorfSectionTaLienSectionTa,
    type JorfSectionTaStructure,
    type JorfTextelrLienSectionTa,
    type JorfTextelrStructure,
    type LegiSectionTa,
    type LegiSectionTaLienSectionTa,
    type LegiSectionTaStructure,
    type LegiTextelrLienSectionTa,
    type LegiTextelrStructure,
  } from "@tricoteuses/legifrance"
  import { SvelteMap } from "svelte/reactivity"

  import { urlPathFromId } from "$lib/urls"

  import { queryArticlesWithLinks } from "./article.remote.js"
  import ArticleBody from "./article-body.svelte"
  import ArticleSummary from "./article-summary.svelte"
  import { querySectionTa } from "./section-ta.remote.js"
  import Structure from "./structure.svelte"
  import StructureItem from "./structure-item.svelte"

  let {
    displayMode,
    showIds,
    structure,
  }: {
    displayMode: "links" | "references"
    showIds: boolean
    structure:
      | JorfSectionTaStructure
      | JorfTextelrStructure
      | LegiSectionTaStructure
      | LegiTextelrStructure
  } = $props()

  let liensArticles = $derived(structure.LIEN_ART)
  const articleWithLinksById = $derived(
    liensArticles === undefined
      ? {}
      : await queryArticlesWithLinks(
          liensArticles.map((lienArticle) => lienArticle["@id"]),
        ),
  )
  let liensSectionsTa = $derived(structure.LIEN_SECTION_TA)
  const sectionTaById = new SvelteMap<
    string,
    JorfSectionTa | LegiSectionTa | undefined
  >()

  const toggleSectionTa = async (
    lienSectionTa:
      | JorfSectionTaLienSectionTa
      | JorfTextelrLienSectionTa
      | LegiSectionTaLienSectionTa
      | LegiTextelrLienSectionTa,
    sectionTa: JorfSectionTa | LegiSectionTa | undefined,
    open: boolean,
  ): Promise<void> => {
    if (open && sectionTa === undefined) {
      sectionTaById.set(
        lienSectionTa["@id"],
        await querySectionTa(lienSectionTa["@id"]),
      )
    }
  }
</script>

{#if liensArticles !== undefined}
  {#each liensArticles as lienArticle}
    {@const articleWithLinks = articleWithLinksById[lienArticle["@id"]]}
    {#if articleWithLinks !== undefined}
      <StructureItem pathname={urlPathFromId(lienArticle["@id"])}>
        {#snippet heading()}
          <ArticleSummary
            article={articleWithLinks.article}
            displayMode="article"
            {showIds}
          />
        {/snippet}

        {#if articleWithLinks !== undefined}
          <ArticleBody {articleWithLinks} {displayMode} />
        {/if}
      </StructureItem>
    {/if}
  {/each}
{/if}

{#if liensSectionsTa !== undefined}
  {#each liensSectionsTa as lienSectionTa}
    {@const sectionTa = sectionTaById.get(lienSectionTa["@id"])}
    <StructureItem
      onOpenChange={(open: boolean) =>
        toggleSectionTa(lienSectionTa, sectionTa, open)}
      pathname={urlPathFromId(lienSectionTa["@id"])}
    >
      {#snippet heading()}
        {lienSectionTa["#text"]} ({lienSectionTa["@debut"]}-{lienSectionTa[
          "@fin"
        ]})
      {/snippet}

      {#if sectionTa !== undefined}
        {@const structureTa = sectionTa.STRUCTURE_TA}
        {#if structureTa !== undefined}
          <section class="mx-4">
            <Structure {displayMode} {showIds} structure={structureTa} />
          </section>
        {/if}
      {/if}
    </StructureItem>
  {/each}
{/if}
