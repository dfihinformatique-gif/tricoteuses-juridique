<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Struct } from "$lib/data"
  import {
    summarizeStructProperties,
    summarizeLegiObject,
  } from "$lib/summaries"

  export let error: unknown
  export let struct: Struct

  const summary = summarizeLegiObject({ key: "struct" }, "struct", struct)
</script>

<header class="prose my-6 max-w-full">
  <h2>Structure</h2>
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
    access={{ key: "struct" }}
    frame={false}
    open
    summarize={summarizeStructProperties}
    value={struct}
  />
{/if}
