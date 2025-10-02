<script lang="ts">
  import { urlPathFromId } from "$lib/urls.js"

  import { autocomplete } from "./autocompletion.remote.js"

  let q: string = $state("loi république numérique")
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Tricoteuses
</h1>

<input bind:value={q} />
<ul>
  <svelte:boundary>
    {#each await autocomplete(q) as { autocompletion, distance, id }}
      {@const urlPath = urlPathFromId(id)}
      <li>
        {#if urlPath === null}
          {autocompletion}
        {:else}
          <a href={urlPath}>{autocompletion}</a>
        {/if}
      </li>
    {/each}
    {#snippet pending()}
      <p>loading...</p>
    {/snippet}
  </svelte:boundary>
</ul>
