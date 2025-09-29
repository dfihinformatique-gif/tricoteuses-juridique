<script lang="ts">
  import { autocomplete } from "./autocompletion.remote.js"

  let q: string = $state("loi république numérique")

  const urlPathFromId = (id: string): string | null =>
    /^(JORF|LEGI)ARTI\d{12}$/.test(id)
      ? `/legifrance/articles/${id}`
      : /^JORFDOLE\d{12}$/.test(q)
        ? `/legifrance/dossiers_legislatifs/${id}`
        : /^(JORF|LEGI)SCTA\d{12}$/.test(id)
          ? `/legifrance/sections/${id}`
          : /^(JORF|LEGI)TEXT\d{12}$/.test(id)
            ? `/legifrance/textes/${id}`
            : null
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
        {#if id === null}
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
