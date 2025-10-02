<script lang="ts">
  import {
    bestItemForDate,
    type LegiArticleTm,
    type LegiSectionTaTm,
  } from "@tricoteuses/legifrance"

  import { urlPathFromId } from "$lib/urls"

  let {
    date,
    tm,
  }: {
    date: string
    tm: LegiArticleTm | LegiSectionTaTm
  } = $props()
</script>

{#snippet view(tm: LegiArticleTm | LegiSectionTaTm)}
  {@const titreTm = bestItemForDate(tm.TITRE_TM, date)!}
  <ul class="ml-4">
    <li>
      <a href={urlPathFromId(titreTm["@id"])}
        >{titreTm["#text"] ?? "Section sans titre"}</a
      >
      {#if tm.TM !== undefined}
        {@render view(tm.TM)}
      {/if}
    </li>
  </ul>
{/snippet}

{@render view(tm)}
