<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Textelr } from "$lib/legal"
  import {
    summarizeTextelrProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  export let textelr: Textelr

  const summary = summarizeLegalObject({ key: "textelr" }, "textelr", textelr)
</script>

<header class="prose my-6 max-w-full">
  <h2>TEXTELR</h2>
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
    access={{ key: "textelr" }}
    frame={false}
    open
    summarize={summarizeTextelrProperties}
    value={textelr}
  />
{/if}
