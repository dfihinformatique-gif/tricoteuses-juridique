<script lang="ts">
  // import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  import { page } from "$app/stores"
  import Pagination from "$lib/components/Pagination.svelte"
  import type { TexteVersion } from "$lib/legal"
  import { summarizeTexteVersionProperties } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  let nature = data.nature ?? ""

  const naturesPromise = (async (): Promise<string[] | undefined> => {
    const apiUrl = "/api/textes/natures"
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) {
      const text = await response.text()
      console.error(
        `Error in ${$page.url.pathname} while calling ${apiUrl}:\n${response.status} ${response.statusText}\n\n${text}`,
      )
      return undefined
    }
    return (await response.json()).natures
  })()
  let q = data.q

  $: texteVersionById = data.texte_version as { [id: string]: TexteVersion }
  $: texteVersionArray = (data.ids as string[]).map(
    (id) => texteVersionById[id],
  )
</script>

<header class="prose my-6 max-w-full">
  <h1>Codes, lois et règlements</h1>
</header>

<form action={$page.url.pathname} class="mx-auto max-w-sm" method="get">
  <div class="form-control">
    <label class="label" for="q">
      <span class="label-text">Intitulé</span>
    </label>
    <input
      class="input-bordered input"
      id="q"
      name="q"
      placeholder="Code civil…"
      type="search"
      bind:value={q}
    />
  </div>

  <div class="form-control">
    <label class="label" for="nature">
      <span class="label-text">Nature</span>
    </label>
    <select
      class="select-bordered select"
      id="nature"
      name="nature"
      bind:value={nature}
    >
      <option value="">Toutes</option>
      {#await naturesPromise}
        {#if nature !== undefined}
          <option selected value={nature}>{nature}</option>
        {/if}
      {:then natures}
        {#if natures !== undefined}
          {#each natures as nature1}
            {#if nature1}
              <option selected={nature1 === nature} value={nature1}
                >{nature1}</option
              >
            {/if}
          {/each}
        {/if}
      {/await}
    </select>
  </div>

  <button class="btn my-4" type="submit">Rechercher</button>
</form>

<TreeView
  access={{ key: "texte_version" }}
  frame={false}
  open
  summarize={summarizeTexteVersionProperties}
  value={texteVersionArray}
/>

<Pagination currentPageCount={texteVersionArray.length} />
