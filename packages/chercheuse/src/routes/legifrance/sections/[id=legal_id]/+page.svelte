<script lang="ts">
  import { error } from "@sveltejs/kit"
  import Structure from "../../Structure.svelte"
  import { getSectionTa } from "../../section_ta.remote.js"

  let { params } = $props()

  const sectionTa = $derived(
    (await getSectionTa(params.id)) ?? error(404, "Section TA non trouvée"),
  )
</script>

<h1>{sectionTa.TITRE_TA}</h1>

{#if sectionTa.STRUCTURE_TA !== undefined}
  <Structure structure={sectionTa.STRUCTURE_TA} />
{/if}
