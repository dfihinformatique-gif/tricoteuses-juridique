<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import { queryDossierParlementairePageInfos } from "../../dossier-parlementaire.remote"
  import DossierParlementaire from "../../dossier-parlementaire.svelte"

  let { params } = $props()

  const dossierParlementairePageInfos = $derived(
    await queryDossierParlementairePageInfos(params.uid),
  )
</script>

{#if dossierParlementairePageInfos === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      { label: `${m.assemblee_dossier_menu_trigger()} ${params.uid}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.error_not_found({ item: `${m.assemblee_dossier_menu_trigger()} ${params.uid}` })}</Alert.Title>
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
        label:
          dossierParlementairePageInfos.dossierParlementaire.titreDossier.titre,
      },
    ]}
  />
  <DossierParlementaire {...dossierParlementairePageInfos} />
{/if}
