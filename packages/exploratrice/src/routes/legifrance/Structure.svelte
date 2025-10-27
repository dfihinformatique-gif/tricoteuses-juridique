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

  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls"

  import { queryArticleWithLinks } from "./article.remote.js"
  import ArticleBody from "./ArticleBody.svelte"
  import type { ArticleWithLinks } from "./article.js"
  import { querySectionTa } from "./section_ta.remote.js"
  import Structure from "./Structure.svelte"
  import StructureItem from "./StructureItem.svelte"
  import ArticleSummary from "./ArticleSummary.svelte"

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

  const articleWithLinksById = new SvelteMap<
    string,
    ArticleWithLinks | undefined
  >()
  const espace = " "
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
        {#if articleWithLinks === undefined}
          {@const dateDebut = lienArticle["@debut"]}
          {@const dateFin = lienArticle["@fin"]}
          {@const etat = lienArticle["@etat"]}
          {#if showIds}
            <code>{lienArticle["@id"]}</code>
          {/if}
          {#if lienArticle["@origine"] === "JORF"}
            Article {lienArticle["@num"] ?? ""} promulgué
          {:else}
            Article {lienArticle["@num"] ?? ""} consolidé
          {/if}
          {#if etat === "MODIFIE_MORT_NE"}
            <b>mort-né</b>
          {:else if etat === "VIGUEUR"}
            <b>en vigueur</b>
          {:else if etat === "VIGUEUR_DIFF"}
            <b>en vigueur différée</b>
          {/if}
          {#if dateDebut !== "2999-01-01"}
            {#if dateDebut === "2222-02-22"}
              dans le futur
            {:else if dateFin === "2999-01-01"}
              {#if etat?.endsWith("_DIFF")}
                à partir du
              {:else}
                depuis le
              {/if}
              {fullDateFormatter(dateDebut)}
            {:else if dateFin <= dateDebut}
              le {fullDateFormatter(dateDebut)}
            {:else}
              du {fullDateFormatter(
                dateDebut,
              )}{#if ["ABROGE", "ABROGE_DIFF", "PERIME", "TRANSFERE"].includes(etat ?? "")},
                {#if ["ABROGE", "ABROGE_DIFF"].includes(etat ?? "")}
                  <b>abrogé</b>
                {:else if etat === "PERIME"}
                  <b>périmé</b>
                {:else}
                  <b>transféré</b>
                {/if}
                {#if dateFin === "2222-02-22"}
                  à une date future
                {:else}
                  le {fullDateFormatter(dateFin)}
                {/if}
              {:else}
                {espace}
                {#if dateFin === "2222-02-22"}
                  à une date future
                {:else}
                  au {fullDateFormatter(dateFin)}
                {/if}
              {/if}
            {/if}
          {/if}
          {#if etat !== undefined && !["ABROGE", "ABROGE_DIFF", "MODIFIE", "MODIFIE_MORT_NE", "PERIME", "TRANSFERE", "VIGUEUR", "VIGUEUR_DIFF"].includes(etat)}
            <b>{etat}</b>
          {/if}
        {:else}
          <ArticleSummary
            article={articleWithLinks.article}
            displayMode="article"
            {showIds}
          />
        {/if}
      {/snippet}

      {#if articleWithLinks !== undefined}
        <ArticleBody {articleWithLinks} {displayMode} />
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
            <Structure {displayMode} {showIds} structure={structureTa} />
          </section>
        {/if}
      {/if}
    </StructureItem>
  {/each}
{/if}
