<script lang="ts">
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
  {#each await autocomplete(q) as { autocompletion, distance, id }}
    <li>{id} {autocompletion} ({distance})</li>
  {/each}
</ul>
