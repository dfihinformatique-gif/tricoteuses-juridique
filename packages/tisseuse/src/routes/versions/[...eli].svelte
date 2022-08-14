<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { VersionsWrapper } from "$lib/legal"
  import {
    summarizeVersionsWrapperProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  let versionsWrapper: VersionsWrapper
  export { versionsWrapper as versions }

  const summary = summarizeLegalObject(
    { key: "versions" },
    "versions",
    versionsWrapper,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>VERSIONS</h2>
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
    summarize={summarizeVersionsWrapperProperties}
    value={versionsWrapper}
  />
{/if}
