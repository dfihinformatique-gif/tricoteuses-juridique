<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import {
    summarizeArticleLienDbProperties,
    summarizeArticleProperties,
    summarizeLegalObject,
    summarizeTexteVersionLienDbProperties,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({
    article,
    article_lien: articleLienDbArray,
    texte_version_lien: texteVersionLienDbArray,
  } = data)

  $: summary = summarizeLegalObject({ key: "article" }, "article", article)
</script>

<IdPagesSwitcher id={article.META.META_COMMUN.ID} />

<header class="my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    ARTICLE
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "article" }}
  frame={false}
  open
  summarize={summarizeArticleProperties}
  value={article}
/>

<section class="mt-4">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    Articles pointant sur l'article
  </h2>

  <TreeView
    access={{ key: "article_lien" }}
    frame={false}
    open
    summarize={summarizeArticleLienDbProperties}
    value={articleLienDbArray}
  />
</section>

<section class="mt-4">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    Textes pointant sur l'article
  </h2>

  <TreeView
    access={{ key: "texte_version_lien" }}
    frame={false}
    open
    summarize={summarizeTexteVersionLienDbProperties}
    value={texteVersionLienDbArray}
  />
</section>
