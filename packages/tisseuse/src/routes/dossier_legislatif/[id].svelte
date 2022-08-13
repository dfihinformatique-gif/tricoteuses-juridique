<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import type { DossierLegislatif } from "$lib/data"
  import {
    summarizeDossierLegislatifProperties,
    summarizeLegalObject,
  } from "$lib/summaries"

  export let error: unknown
  let dossierLegislatif: DossierLegislatif
  export { dossierLegislatif as dossier_legislatif }

  const summary = summarizeLegalObject(
    { key: "dossier_legislatif" },
    "dossier_legislatif",
    dossierLegislatif,
  )
</script>

<header class="prose my-6 max-w-full">
  <h2>DOSSIER_LEGISLATIF</h2>
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
    access={{ key: "dossier_legislatif" }}
    frame={false}
    open
    summarize={summarizeDossierLegislatifProperties}
    value={dossierLegislatif}
  />
{/if}
