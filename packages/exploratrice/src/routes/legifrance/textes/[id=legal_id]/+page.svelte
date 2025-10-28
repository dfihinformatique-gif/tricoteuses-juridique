<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

  import { queryTextePageInfos } from "../../texte.remote.js"
  import Texte from "../../texte.svelte"

  let { params } = $props()

  const textePageInfos = $derived(await queryTextePageInfos(params.id))
  let displayMode: "links" | "references" = $state("links")
  let showIds = $state(false)
</script>

{#if textePageInfos === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Texte {params.id} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <Texte bind:displayMode bind:showIds {textePageInfos} />
{/if}
