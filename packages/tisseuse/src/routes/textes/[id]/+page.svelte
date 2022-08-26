<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import TexteVersionView from "$lib/components/TexteVersionView.svelte"
  import { summarizeLegalObject } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  let showArticles = false
  let showRawData = false

  $: id = data.id!
  $: texteVersion = data.texte_version![id]

  $: summary = summarizeLegalObject(
    { key: "texte_version" },
    "texte_version",
    texteVersion,
  )
</script>

<IdPagesSwitcher {id} />

<header class="prose my-6 max-w-full">
  <h2>Codes, lois et règlements</h2>
  {#if summary !== undefined}
    <h1>
      <SummaryView {summary} />
    </h1>
  {/if}
</header>

<form class="max-w-xs" on:submit|preventDefault>
  <div class="form-control">
    <label class="label cursor-pointer">
      <span class="label-text">Données brutes</span>
      <input class="toggle" type="checkbox" bind:checked={showRawData} />
    </label>
  </div>
  <div class="form-control">
    <label class="label cursor-pointer">
      <span class="label-text">Montrer les articles</span>
      <input class="toggle" type="checkbox" bind:checked={showArticles} />
    </label>
  </div>
</form>

{#if showRawData}
  <TreeView frame={false} open value={data} />
{:else}
  <TexteVersionView {data} {showArticles} {texteVersion} />
{/if}
