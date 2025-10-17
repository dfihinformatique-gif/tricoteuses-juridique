<script lang="ts">
  import * as Command from "$lib/components/ui/command/index.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { autocomplete } from "./autocompletion.remote.js"

  let q: string = $state("loi république numérique")
  let suggestions = $derived(await autocomplete(q))
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Tricoteuses
</h1>

<Command.Root shouldFilter={false}>
  <Command.Input placeholder="Type a command or search..." bind:value={q} />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group>
      {#each suggestions as { autocompletion, id } (`${id}_${autocompletion}`)}
        {@const urlPath = urlPathFromId(id)}
        <Command.Item>
          {#if urlPath === null}
            {autocompletion}
          {:else}
            <a href={urlPath}>{autocompletion}</a>
          {/if}
        </Command.Item>
      {/each}
    </Command.Group>
  </Command.List>
</Command.Root>
