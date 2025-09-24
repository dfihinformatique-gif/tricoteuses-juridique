<script lang="ts">
  import type {
    JorfArticle,
    JorfSectionTa,
    JorfSectionTaStructure,
    JorfTextelrStructure,
    LegiArticle,
    LegiSectionTa,
    LegiSectionTaStructure,
    LegiTextelrStructure,
  } from "@tricoteuses/legifrance"
  import { SvelteMap } from "svelte/reactivity"

  import {
    getArticle,
    getArticleContenuAvecLiens,
    getSectionTa,
    getTexte,
  } from "./texte.remote.js"

  let { params } = $props()

  const { textelr, texteVersion } = $derived(await getTexte(params.id))

  const articleById = $state(
    new SvelteMap<string, JorfArticle | LegiArticle | undefined>(),
  )
  const articleContenuAvecLiensById = $state(
    new SvelteMap<string, { blocTextuel: string } | undefined>(),
  )
  const openById = $state(new SvelteMap<string, boolean>())
  const sectionTaById = $state(
    new SvelteMap<string, JorfSectionTa | LegiSectionTa | undefined>(),
  )
</script>

{#snippet sectionView(
  struct:
    | JorfSectionTaStructure
    | JorfTextelrStructure
    | LegiSectionTaStructure
    | LegiTextelrStructure,
)}
  {@const liensArticles = struct.LIEN_ART}
  {@const liensSectionsTa = struct.LIEN_SECTION_TA}
  {#if liensArticles !== undefined}
    {#each liensArticles as lienArticle}
      {@const article = articleById.get(lienArticle["@id"])}
      {#if article === undefined || !openById.get(lienArticle["@id"])}
        <button
          class="block"
          onclick={async () => {
            if (article === undefined) {
              articleById.set(
                lienArticle["@id"],
                await getArticle(lienArticle["@id"]),
              )
              articleContenuAvecLiensById.set(
                lienArticle["@id"],
                await getArticleContenuAvecLiens(lienArticle["@id"]),
              )
            }
            openById.set(lienArticle["@id"], true)
          }}
        >
          Article {lienArticle["@num"]} ({lienArticle["@debut"]}-{lienArticle[
            "@fin"
          ]}
        </button>
      {:else}
        {@const blocTextuel = article.BLOC_TEXTUEL?.CONTENU}
        {@const blocTextuelAvecLiens = articleContenuAvecLiensById.get(
          lienArticle["@id"],
        )?.blocTextuel}
        <button
          class="block"
          onclick={() => {
            openById.delete(lienArticle["@id"])
          }}
        >
          Article {lienArticle["@num"]} ({lienArticle["@debut"]}-{lienArticle[
            "@fin"
          ]}
        </button>
        {#if blocTextuel !== undefined}
          <section class="prose ml-4">
            {@html blocTextuelAvecLiens ?? blocTextuel}
          </section>
        {/if}
      {/if}
    {/each}
  {/if}

  {#if liensSectionsTa !== undefined}
    {#each liensSectionsTa as lienSectionTa}
      {@const sectionTa = sectionTaById.get(lienSectionTa["@id"])}
      {#if sectionTa === undefined || !openById.get(lienSectionTa["@id"])}
        <button
          class="block"
          onclick={async () => {
            if (sectionTa === undefined) {
              sectionTaById.set(
                lienSectionTa["@id"],
                await getSectionTa(lienSectionTa["@id"]),
              )
            }
            openById.set(lienSectionTa["@id"], true)
          }}
        >
          {lienSectionTa["#text"]} ({lienSectionTa["@debut"]}-{lienSectionTa[
            "@fin"
          ]})
        </button>
      {:else}
        {@const structureTa = sectionTa.STRUCTURE_TA}
        <button
          class="block"
          onclick={() => {
            openById.delete(lienSectionTa["@id"])
          }}
        >
          {lienSectionTa["#text"]} ({lienSectionTa["@debut"]}-{lienSectionTa[
            "@fin"
          ]})
        </button>
        {#if structureTa !== undefined}
          <section class="ml-4">
            {@render sectionView(structureTa)}
          </section>
        {/if}
      {/if}
    {/each}
  {/if}
{/snippet}

<h1>{texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}</h1>

{#if textelr?.STRUCT !== undefined}
  {@render sectionView(textelr.STRUCT)}
{/if}
