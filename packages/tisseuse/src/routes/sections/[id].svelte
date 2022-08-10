<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Section } from "$lib/data"
  import {
    summarizeSectionProperties,
    summarizeLegiObject,
  } from "$lib/summaries"

  export let error: unknown
  export let section: Section

  const summary = summarizeLegiObject({ key: "section" }, "section", section)
</script>

<header class="prose my-6 max-w-full">
  <h2>Section</h2>
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
    access={{ key: "section" }}
    frame={false}
    open
    summarize={summarizeSectionProperties}
    value={section}
  />
{/if}
