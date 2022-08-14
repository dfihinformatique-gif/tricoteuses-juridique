<script lang="ts">
  // import Icon from "@iconify/svelte"
  // import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  // import { page } from "$app/stores"
  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import Pagination from "$lib/components/Pagination.svelte"
  import type { IdWrapper } from "$lib/legal"
  import { summarizeIdWrapperProperties } from "$lib/summaries"

  let idsWrapper: IdWrapper[]
  export { idsWrapper as id }
  export let error: unknown
</script>

<header class="prose my-6 max-w-full">
  <h1>ID</h1>
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

{#if error != null}
  <ErrorAlert {error} />
{/if}

{#if error == null}
  <TreeView
    access={{ key: "id" }}
    frame={false}
    open
    summarize={summarizeIdWrapperProperties}
    value={idsWrapper}
  />

  <Pagination currentPageCount={idsWrapper.length ?? 0} />
{/if}
