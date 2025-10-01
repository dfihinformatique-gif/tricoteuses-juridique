<script lang="ts">
  import { urlPathFromId } from "$lib/urls.js"

  import { autocomplete } from "./autocompletion.remote.js"

  let q: string = $state("loi république numérique")
</script>

<h1>Welcome to SvelteKit</h1>
<p>
  Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the
  documentation
</p>

<h1>Autocompletions</h1>

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
