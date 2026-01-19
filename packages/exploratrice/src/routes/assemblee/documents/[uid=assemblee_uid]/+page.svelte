<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import { PageBreadcrumb } from "$lib/components/tricoteuses/index.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryDocumentPageInfos } from "../../document.remote.js"
  import Document from "../../document.svelte"

  let { params } = $props()

  const documentPageInfos = $derived(await queryDocumentPageInfos(params.uid))
</script>

{#if documentPageInfos === undefined}
  <PageBreadcrumb
    segments={[
      { label: "Dossiers législatifs", href: "/assemblee/dossiers_legislatifs" },
      { label: `Document ${params.uid}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {params.uid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: "Dossiers législatifs", href: "/assemblee/dossiers_legislatifs" },
      { label: "Dossier législatif", href: urlPathFromId(documentPageInfos.document.dossierRef) },
      { label: documentPageInfos.document.titres.titrePrincipal },
    ]}
  />
  <Document {...documentPageInfos} />
{/if}
