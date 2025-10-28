<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

  import { queryDossierParlementairePageInfos } from "../../dossier-parlementaire.remote"
  import DossierParlementaire from "../../dossier-parlementaire.svelte"

  let { params } = $props()

  const dossierParlementairePageInfos = $derived(
    await queryDossierParlementairePageInfos(params.uid),
  )
</script>

{#if dossierParlementairePageInfos === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Dossier législatif {params.uid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <DossierParlementaire {...dossierParlementairePageInfos} />
{/if}
