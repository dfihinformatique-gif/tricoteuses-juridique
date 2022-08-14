<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { SectionTa } from "$lib/legal"
  import {
    summarizeSectionTaProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  let sectionTa: SectionTa
  export { sectionTa as section_ta }

  const summary = summarizeLegalObject(
    { key: "section_ta" },
    "section_ta",
    sectionTa,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>SECTION_TA</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

{#if error != null}
  <ErrorAlert {error} />
{/if}

{#if error == null}
  <TreeView
    access={{ key: "section_ta" }}
    frame={false}
    open
    summarize={summarizeSectionTaProperties}
    value={sectionTa}
  />
{/if}
