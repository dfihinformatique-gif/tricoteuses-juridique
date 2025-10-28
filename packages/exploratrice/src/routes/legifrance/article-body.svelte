<script lang="ts">
  import type { LegiArticle } from "@tricoteuses/legifrance"

  import { cleanHtmlContenu } from "$lib/strings.js"

  import type { ArticleWithLinks } from "./article.js"
  import HtmlFragmentWithReferences from "./html-fragment-with-references.svelte"

  let {
    articleWithLinks,
    displayMode,
  }: {
    articleWithLinks: ArticleWithLinks
    displayMode: "links" | "references"
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
  <section class="ml-4">
    <i
      >Cet article {#if article.META.META_COMMUN.ORIGINE === "JORF"}publié au
        Journal officiel{/if} n'est pas encore numérisé.</i
    >
  </section>
{:else if displayMode === "links"}
  <section class="prose prose-links ml-4">
    {@html cleanHtmlContenu(blocTextuel)}
  </section>
{:else}
  <section class="prose prose-links ml-4">
    <HtmlFragmentWithReferences fragment={article.BLOC_TEXTUEL!.CONTENU} />
  </section>
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
