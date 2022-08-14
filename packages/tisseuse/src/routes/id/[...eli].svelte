<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { IdWrapper } from "$lib/legal"
  import {
    summarizeIdWrapperProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  let idWrapper: IdWrapper
  export { idWrapper as id }

  const summary = summarizeLegalObject({ key: "id" }, "id", idWrapper)
</script>

<header class="prose my-6 max-w-full">
  <h2>ID</h2>
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
    access={{ key: "article" }}
    frame={false}
    open
    summarize={summarizeIdWrapperProperties}
    value={idWrapper}
  />
{/if}
