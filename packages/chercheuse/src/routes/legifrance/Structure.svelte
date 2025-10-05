<script lang="ts">
  import type {
    JorfArticle,
    JorfSectionTa,
    JorfSectionTaLienArt,
    JorfSectionTaLienSectionTa,
    JorfSectionTaStructure,
    JorfTextelrLienArt,
    JorfTextelrLienSectionTa,
    JorfTextelrStructure,
    LegiArticle,
    LegiSectionTa,
    LegiSectionTaLienArt,
    LegiSectionTaLienSectionTa,
    LegiSectionTaStructure,
    LegiTextelrLienArt,
    LegiTextelrLienSectionTa,
    LegiTextelrStructure,
  } from "@tricoteuses/legifrance"
  import { SvelteMap } from "svelte/reactivity"

  import type { ArticleWithLinks } from "$lib/articles.js"

  import { queryArticleWithLinks } from "./article.remote.js"
  import { querySectionTa } from "./section_ta.remote.js"
  import Structure from "./Structure.svelte"

  let {
    structure,
  }: {
    structure:
      | JorfSectionTaStructure
      | JorfTextelrStructure
      | LegiSectionTaStructure
      | LegiTextelrStructure
  } = $props()

  const articleWithLinksById = $state(
    new SvelteMap<string, ArticleWithLinks | undefined>(),
  )
  const articleContenuAvecLiensById = $state(
    new SvelteMap<string, { blocTextuel: string } | undefined>(),
  )
  let liensArticles = $derived(structure.LIEN_ART)
  let liensSectionsTa = $derived(structure.LIEN_SECTION_TA)
  const openById = $state(new SvelteMap<string, boolean>())
  const sectionTaById = $state(
    new SvelteMap<string, JorfSectionTa | LegiSectionTa | undefined>(),
  )

  const toggleArticle = async (
    lienArticle:
      | JorfSectionTaLienArt
      | JorfTextelrLienArt
      | LegiSectionTaLienArt
      | LegiTextelrLienArt,
    article: JorfArticle | LegiArticle | undefined,
  ): Promise<void> => {
    if (openById.get(lienArticle["@id"])) {
      openById.delete(lienArticle["@id"])
    } else {
      if (article === undefined) {
        articleWithLinksById.set(
          lienArticle["@id"],
          await queryArticleWithLinks(lienArticle["@id"]),
        )
      }
      openById.set(lienArticle["@id"], true)
    }
  }

  const toggleSectionTa = async (
    lienSectionTa:
      | JorfSectionTaLienSectionTa
      | JorfTextelrLienSectionTa
      | LegiSectionTaLienSectionTa
      | LegiTextelrLienSectionTa,
    sectionTa: JorfSectionTa | LegiSectionTa | undefined,
  ): Promise<void> => {
    if (openById.get(lienSectionTa["@id"])) {
      openById.delete(lienSectionTa["@id"])
    } else {
      if (sectionTa === undefined) {
        sectionTaById.set(
          lienSectionTa["@id"],
          await querySectionTa(lienSectionTa["@id"]),
        )
      }
      openById.set(lienSectionTa["@id"], true)
    }
  }
</script>

{#if liensArticles !== undefined}
  {#each liensArticles as lienArticle}
    {@const articleWithLinks = articleWithLinksById.get(lienArticle["@id"])}
    <div>
      <button
        onclick={() => toggleArticle(lienArticle, articleWithLinks?.article)}
      >
        Article {lienArticle["@num"]} ({lienArticle["@debut"]}-{lienArticle[
          "@fin"
        ]}
      </button>
      <a href="/legifrance/articles/{lienArticle['@id']}">Voir à part</a>
    </div>
    {#if articleWithLinks !== undefined && openById.get(lienArticle["@id"])}
      {@const { article } = articleWithLinks}
      {@const blocTextuel =
        articleWithLinks.blocTextuel ?? article.BLOC_TEXTUEL?.CONTENU}
      {@const nota =
        articleWithLinks.nota ?? (article as LegiArticle).NOTA?.CONTENU}
      {#if blocTextuel !== undefined}
        <section class="prose ml-4">
          {@html blocTextuel}
        </section>
      {/if}
      {#if nota !== undefined}
        <h2>Nota</h2>
        <section class="prose ml-4">
          {@html nota}
        </section>
      {/if}
    {/if}
  {/each}
{/if}

{#if liensSectionsTa !== undefined}
  {#each liensSectionsTa as lienSectionTa}
    {@const sectionTa = sectionTaById.get(lienSectionTa["@id"])}
    <div>
      <button onclick={() => toggleSectionTa(lienSectionTa, sectionTa)}>
        {lienSectionTa["#text"]} ({lienSectionTa["@debut"]}-{lienSectionTa[
          "@fin"
        ]})
      </button>
      <a href="/legifrance/sections/{lienSectionTa['@id']}">Voir à part</a>
    </div>
    {#if sectionTa !== undefined && openById.get(lienSectionTa["@id"])}
      {@const structureTa = sectionTa.STRUCTURE_TA}
      {#if structureTa !== undefined}
        <section class="ml-4">
          <Structure structure={structureTa} />
        </section>
      {/if}
    {/if}
  {/each}
{/if}
