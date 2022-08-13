<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { TexteVersion } from "$lib/data"
  import {
    summarizeTexteVersionProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  let texteVersion: TexteVersion
  export { texteVersion as texte_version }

  const summary = summarizeLegalObject(
    { key: "texte_version" },
    "texte_version",
    texteVersion,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>TEXTE_VERSION</h2>
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
    access={{ key: "texte_version" }}
    frame={false}
    open
    summarize={summarizeTexteVersionProperties}
    value={texteVersion}
  />
{/if}
