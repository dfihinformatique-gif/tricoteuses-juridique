<script lang="ts">
  // import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  // import { page } from "$app/stores"
  import Pagination from "$lib/components/Pagination.svelte"
  import { summarizeDossierLegislatifProperties } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ dossier_legislatif: dossiersLegislatifs } = data)
</script>

<header class="prose my-6 max-w-full">
  <h1>DOSSIER_LEGISLATIF</h1>
</header>

<!-- <form action={$page.url.pathname} class="mx-auto max-w-sm" method="get">
  <div class="form-control">
    <div class="input-group">
      <input
        class="input input-bordered"
        name="q"
        type="search"
        bind:value={q}
      />
      <button class="btn btn-square" type="submit">
        <iconify-icon icon={searchIcon} />
      </button>
    </div>
  </div>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Législature</span>
      <select
        class="select select-bordered"
        name="legislature"
        bind:value={legislature}
      >
        <option value="">Toutes</option>
        {#each Object.entries(Legislature) as [key, value]}
          {#if value !== "*"}
            <option {value}>{key}</option>
          {/if}
        {/each}
      </select>
    </label>
  </div>
</form> -->

<TreeView
  access={{ key: "dossier_legislatif" }}
  frame={false}
  open
  summarize={summarizeDossierLegislatifProperties}
  value={dossiersLegislatifs}
/>

<Pagination currentPageCount={dossiersLegislatifs?.length ?? 0} />
