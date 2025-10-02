<script lang="ts">
  import type { JorfArticleTm, JorfSectionTaTm } from "@tricoteuses/legifrance"

  import { urlPathFromId } from "$lib/urls"

  let {
    tm,
  }: {
    tm: JorfArticleTm | JorfSectionTaTm
  } = $props()
</script>

{#snippet view(tm: JorfArticleTm | JorfSectionTaTm)}
  <ul class="ml-4">
    <li>
      <a href={urlPathFromId(tm.TITRE_TM["@id"])}
        >{tm.TITRE_TM["#text"] ?? "Section sans titre"}</a
      >
      {#if tm.TM !== undefined}
        {@render view(tm.TM)}
      {/if}
    </li>
  </ul>
{/snippet}

{@render view(tm)}
