<script lang="ts">
  import {
    type JorfArticle,
    type JorfSectionTa,
    type JorfSectionTaLienArt,
    type JorfSectionTaLienSectionTa,
    type JorfSectionTaStructure,
    type JorfTextelrLienArt,
    type JorfTextelrLienSectionTa,
    type JorfTextelrStructure,
    type LegiArticle,
    type LegiSectionTa,
    type LegiSectionTaLienArt,
    type LegiSectionTaLienSectionTa,
    type LegiSectionTaStructure,
    type LegiTextelrLienArt,
    type LegiTextelrLienSectionTa,
    type LegiTextelrStructure,
  } from "@tricoteuses/legifrance"
  import { SvelteMap } from "svelte/reactivity"

  import type { ArticleWithLinks } from "$lib/articles.js"
  import { cleanHtmlContenu } from "$lib/strings.js"
  import { urlPathFromId } from "$lib/urls"

  import { queryArticleWithLinks } from "./article.remote.js"
  import HtmlFragmentWithReferences from "./HtmlFragmentWithReferences.svelte"
  import { querySectionTa } from "./section_ta.remote.js"
  import Structure from "./Structure.svelte"
  import StructureItem from "./StructureItem.svelte"

  let {
    displayMode,
    structure,
  }: {
    displayMode: "links" | "references"
    structure:
      | JorfSectionTaStructure
      | JorfTextelrStructure
      | LegiSectionTaStructure
      | LegiTextelrStructure
  } = $props()

  const articleWithLinksById = new SvelteMap<
    string,
    ArticleWithLinks | undefined
  >()
  let liensArticles = $derived(structure.LIEN_ART)
  let liensSectionsTa = $derived(structure.LIEN_SECTION_TA)
  const sectionTaById = new SvelteMap<
    string,
    JorfSectionTa | LegiSectionTa | undefined
  >()

  const toggleArticle = async (
    lienArticle:
      | JorfSectionTaLienArt
      | JorfTextelrLienArt
      | LegiSectionTaLienArt
      | LegiTextelrLienArt,
    article: JorfArticle | LegiArticle | undefined,
    open: boolean,
  ): Promise<void> => {
    if (open && article === undefined) {
      articleWithLinksById.set(
        lienArticle["@id"],
        await queryArticleWithLinks(lienArticle["@id"]),
      )
    }
  }

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
    {@const articleWithLinks = articleWithLinksById.get(lienArticle["@id"])}
    <StructureItem
      onOpenChange={(open: boolean) =>
        toggleArticle(lienArticle, articleWithLinks?.article, open)}
      pathname={urlPathFromId(lienArticle["@id"])}
    >
      {#snippet heading()}
        Article {lienArticle["@num"]} ({lienArticle["@debut"]}-{lienArticle[
          "@fin"
        ]}
      {/snippet}

      {#if articleWithLinks !== undefined}
        {@const { article } = articleWithLinks}
        {@const blocTextuel =
          articleWithLinks.blocTextuel ?? article.BLOC_TEXTUEL?.CONTENU}
        {@const nota =
          articleWithLinks.nota ?? (article as LegiArticle).NOTA?.CONTENU}
        {#if blocTextuel !== undefined}
          {#if displayMode === "links"}
            <section class="prose prose-links ml-4">
              {@html cleanHtmlContenu(blocTextuel)}
            </section>
          {:else}
            <section class="prose prose-links ml-4">
              <HtmlFragmentWithReferences
                fragment={article.BLOC_TEXTUEL!.CONTENU}
              />
            </section>
          {/if}
        {/if}
        {#if nota !== undefined}
          <h2>Nota</h2>
          {#if displayMode === "links"}
            <section class="prose prose-links ml-4">
              {@html cleanHtmlContenu(nota)}
            </section>
          {:else}
            <section class="prose prose-links ml-4">
              <HtmlFragmentWithReferences
                fragment={(article as LegiArticle).NOTA!.CONTENU}
              />
            </section>
          {/if}
        {/if}
      {/if}
    </StructureItem>
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
          <section class="ml-4">
            <Structure {displayMode} structure={structureTa} />
          </section>
        {/if}
      {/if}
    </StructureItem>
  {/each}
{/if}
