<script lang="ts">
  import type { LegiArticle } from "@tricoteuses/legifrance"

  import type { ArticleDisplayMode, ArticleWithLinks } from "./article.js"
  import HtmlFragmentWithLinks from "./html-fragment-with-links.svelte"
  import HtmlFragmentWithReferences from "./html-fragment-with-references.svelte"

  let {
    articleWithLinks,
    displayMode,
  }: {
    articleWithLinks: ArticleWithLinks
    displayMode: ArticleDisplayMode
  } = $props()

  const {
    article,
    blocTextuel: blocTextuelWithLinks,
    nota: notaWithLinks,
  } = $derived(articleWithLinks)
  const blocTextuel = $derived(
    blocTextuelWithLinks ?? article.BLOC_TEXTUEL?.CONTENU,
  )
  const nota = $derived(notaWithLinks ?? (article as LegiArticle).NOTA?.CONTENU)
</script>

{#if blocTextuel === undefined}
  <section class="mx-4">
    <i
      >Cet article {#if article.META.META_COMMUN.ORIGINE === "JORF"}publié au
        Journal officiel{/if} n'est pas encore numérisé.</i
    >
  </section>
{:else if displayMode === "links"}
  <section class="prose prose-links mx-4">
    <HtmlFragmentWithLinks fragment={blocTextuel} />
  </section>
{:else}
  <section class="prose mx-4">
    <HtmlFragmentWithReferences fragment={article.BLOC_TEXTUEL!.CONTENU} />
  </section>
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={nota} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences
        fragment={(article as LegiArticle).NOTA!.CONTENU}
      />
    </section>
  {/if}
{/if}
