<script lang="ts">
  import { TreeView, SummaryView } from "augmented-data-viewer"

  import { goto } from "$app/navigation"
  import { page } from "$app/stores"
  import type { Follow } from "$lib/aggregates"
  import IdPagesSwitcher from "$lib/components/IdPagesSwitcher.svelte"
  import TexteVersionView from "$lib/components/TexteVersionView.svelte"
  import type { TexteVersion } from "$lib/legal"
  import { summarizeLegalObject } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  let showArticles = false
  let showRawData = false

  $: follow = data.follow
  $: id = data.id
  $: texteVersion = (
    data.texte_version as { [texteVersionId: string]: TexteVersion }
  )[id]
  $: url = $page.url

  $: summary = summarizeLegalObject(
    { key: "texte_version" },
    "texte_version",
    texteVersion,
  )

  $: if (
    showArticles &&
    !(["STRUCT.LIEN_ART.@id", "STRUCTURE_TA.LIEN_ART.@id"] as Follow[]).every(
      (aFollow) => follow.includes(aFollow),
    )
  ) {
    const newFollow = new Set(follow)
    for (const aFollow of [
      "STRUCT.LIEN_ART.@id",
      "STRUCTURE_TA.LIEN_ART.@id",
    ] as Follow[]) {
      newFollow.add(aFollow)
    }
    const searchParams = new URLSearchParams(url.search)
    searchParams.delete("follow")
    for (const aFollow of [...newFollow].sort()) {
      searchParams.append("follow", aFollow)
    }
    goto(new URL(`${url.pathname}?${searchParams.toString()}`, url), {
      keepFocus: true,
      noScroll: true,
    })
  }
</script>

<IdPagesSwitcher {id} />

<header class="my-6 max-w-full">
  <h2
    class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
  >
    Codes, lois et règlements
  </h2>
  {#if summary !== undefined}
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
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
