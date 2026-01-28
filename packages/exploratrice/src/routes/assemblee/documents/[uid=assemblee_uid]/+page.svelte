<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import { queryDocumentPageInfos } from "../../document.remote.js"
  import Document from "../../document.svelte"

  let { params } = $props()

  const documentPageInfos = $derived(await queryDocumentPageInfos(params.uid))
</script>

{#if documentPageInfos === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      { label: `${m.assemblee_document_menu_trigger()} ${params.uid}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.assemblee_document_not_found({ uid: params.uid })}</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      {
        label: m.assemblee_dossier_menu_trigger(),
        href: urlPathFromId(documentPageInfos.document.dossierRef) ?? undefined,
      },
      { label: documentPageInfos.document.titres.titrePrincipal },
    ]}
  />
  <Document {...documentPageInfos} />
{/if}
