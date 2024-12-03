<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import {
    summarizeArticleLienDbProperties,
    summarizeLegalObject,
    summarizeSectionTaProperties,
    summarizeTexteVersionLienDbProperties,
  } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({
    article_lien: articleLienDbArray,
    section_ta: sectionTa,
    texte_version_lien: texteVersionLienDbArray,
  } = data)

  $: summary = summarizeLegalObject(
    { key: "section_ta" },
    "section_ta",
    sectionTa,
  )
</script>

<header class="my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    SECTION_TA
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<TreeView
  access={{ key: "section_ta" }}
  frame={false}
  open
  summarize={summarizeSectionTaProperties}
  value={sectionTa}
/>

<section class="mt-4">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    Articles pointant sur la SECTION_TA
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
    Textes pointant sur la SECTION_TA
  </h2>

  <TreeView
    access={{ key: "texte_version_lien" }}
    frame={false}
    open
    summarize={summarizeTexteVersionLienDbProperties}
    value={texteVersionLienDbArray}
  />
</section>
