<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

  import { queryDocumentPageInfos } from "../../document.remote.js"
  import Document from "../../document.svelte"

  let { params } = $props()

  const documentPageInfos = $derived(await queryDocumentPageInfos(params.uid))
</script>

{#if documentPageInfos === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {params.uid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <Document {...documentPageInfos} />
{/if}
