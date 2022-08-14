<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { Textekali } from "$lib/legal"
  import {
    summarizeTextekaliProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  export let textekali: Textekali

  const summary = summarizeLegalObject(
    { key: "textekali" },
    "textekali",
    textekali,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>TEXTEKALI</h2>
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
    access={{ key: "textekali" }}
    frame={false}
    open
    summarize={summarizeTextekaliProperties}
    value={textekali}
  />
{/if}
