<script lang="ts">
  // import Icon from "@iconify/svelte"
  // import searchIcon from "@iconify-icons/codicon/search"
  import { TreeView } from "augmented-data-viewer"

  // import { page } from "$app/stores"
  import ErrorAlert from "$lib/components/errors/ErrorAlert.svelte"
  import Pagination from "$lib/components/Pagination.svelte"
  import type { Jo } from "$lib/legal"
  import { summarizeJoProperties } from "$lib/summaries"

  export let error: unknown
  let jos: Jo[]
  export { jos as jo }
</script>

<header class="prose my-6 max-w-full">
  <h1>JO</h1>
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
        {#each Object.entries(Jorfslature) as [key, value]}
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
    access={{ key: "jo" }}
    frame={false}
    open
    summarize={summarizeJoProperties}
    value={jos}
  />

  <Pagination currentPageCount={jos.length ?? 0} />
{/if}
