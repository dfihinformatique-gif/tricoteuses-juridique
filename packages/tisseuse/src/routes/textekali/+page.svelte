<script lang="ts">
  throw new Error(
    "@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)",
  )

  // import Icon from "@iconify/svelte"
  // import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  // import { page } from "$app/stores"
  import Pagination from "$lib/components/Pagination.svelte"
  import { summarizeTextekaliProperties } from "$lib/summaries"

  import type { PageData } from "./$types"

  export let data: PageData

  $: ({ textekali: textekaliArray } = data)
</script>

<header class="prose my-6 max-w-full">
  <h1>TEXTEKALI</h1>
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
        <Icon icon={searchIcon} />
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
  access={{ key: "textekali" }}
  frame={false}
  open
  summarize={summarizeTextekaliProperties}
  value={textekaliArray}
/>

<Pagination currentPageCount={textekaliArray?.length ?? 0} />
