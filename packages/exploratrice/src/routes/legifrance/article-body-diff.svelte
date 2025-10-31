<script lang="ts">
  import type { JorfArticle, LegiArticle } from "@tricoteuses/legifrance"

  import HtmlDiffInline from "./html-diff-inline.svelte"
  import HtmlDiffSideBySide from "./html-diff-side-by-side.svelte"

  let {
    article,
    displayMode,
    previousArticle,
  }: {
    article: JorfArticle | LegiArticle
    displayMode: "inline_diff" | "side-by-side_diff"
    previousArticle: JorfArticle | LegiArticle
  } = $props()

  const blocTextuel = $derived(article.BLOC_TEXTUEL?.CONTENU)
  const HtmlDiff = $derived(
    displayMode === "inline_diff" ? HtmlDiffInline : HtmlDiffSideBySide,
  )
  const nota = $derived((article as LegiArticle).NOTA?.CONTENU)
  const previousBlocTextuel = $derived(previousArticle.BLOC_TEXTUEL?.CONTENU)
  const previousNota = $derived((previousArticle as LegiArticle).NOTA?.CONTENU)
</script>

{#if blocTextuel === undefined && previousBlocTextuel === undefined}
  <section class="mx-4">
    <i>Aucun contenu</i>
  </section>
{:else}
  <HtmlDiff current={blocTextuel ?? ""} previous={previousBlocTextuel ?? ""} />
{/if}

{#if nota !== undefined || previousNota !== undefined}
  <h2>Nota</h2>
  <HtmlDiff current={nota ?? ""} previous={previousNota ?? ""} />
{/if}
