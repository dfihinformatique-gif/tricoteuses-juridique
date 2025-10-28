<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

  import { querySectionTa } from "../../section-ta.remote.js"
  import SectionTa from "../../section-ta.svelte"

  let { params } = $props()

  let displayMode: "links" | "references" = $state("links")
  const sectionTa = $derived(await querySectionTa(params.id))
  let showIds = $state(false)
</script>

{#if sectionTa === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Section texte article {params.id} non trouvée !</Alert.Title>
  </Alert.Root>
{:else}
  <SectionTa bind:displayMode {sectionTa} bind:showIds />
{/if}
