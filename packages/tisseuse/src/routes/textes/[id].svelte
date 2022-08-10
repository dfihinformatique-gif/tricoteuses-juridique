<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { TexteVersion } from "$lib/data"
  import { summarizeTexteProperties, summarizeLegiObject } from "$lib/summaries"

  export let error: unknown
  export let texte: TexteVersion

  const summary = summarizeLegiObject({ key: "texte" }, "texte", texte)
</script>

<header class="prose my-6 max-w-full">
  <h2>Texte</h2>
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
    access={{ key: "texte" }}
    frame={false}
    open
    summarize={summarizeTexteProperties}
    value={texte}
  />
{/if}
