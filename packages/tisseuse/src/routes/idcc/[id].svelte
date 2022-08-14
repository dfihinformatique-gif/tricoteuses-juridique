<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Idcc } from "$lib/legal"
  import { summarizeIdccProperties, summarizeLegalObject } from "$lib/summaries"

  export let error: unknown
  export let idcc: Idcc

  const summary = summarizeLegalObject({ key: "idcc" }, "idcc", idcc)
</script>

<header class="prose my-6 max-w-full">
  <h2>IDCC</h2>
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
    access={{ key: "idcc" }}
    frame={false}
    open
    summarize={summarizeIdccProperties}
    value={idcc}
  />
{/if}
