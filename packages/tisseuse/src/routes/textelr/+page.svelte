<script lang="ts">
  import { TreeView } from "augmented-data-viewer"

  // import { page } from "$app/stores"
  import Pagination from "$lib/components/Pagination.svelte"
  import { summarizeTextelrProperties } from "$lib/summaries.js"

  import type { PageData } from "./$types.js"

  export let data: PageData

  $: ({ textelr: textelrArray } = data)
</script>

<header class="my-6 max-w-full">
  <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
    TEXTELR
  </h1>
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
        <Search />
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
  access={{ key: "textelr" }}
  frame={false}
  open
  summarize={summarizeTextelrProperties}
  value={textelrArray}
/>

<Pagination currentPageCount={textelrArray?.length ?? 0} />
