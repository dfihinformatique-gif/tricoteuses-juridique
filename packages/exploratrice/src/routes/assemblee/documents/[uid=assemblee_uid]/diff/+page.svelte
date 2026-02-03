<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import { queryDocumentsDiffPageInfos } from "../../../document.remote.js"
  import DocumentsDiff from "../../../documents-diff.svelte"

  let { params } = $props()

  const previousUid = "PRJLANR5L15B4482"
  const documentsDiffPageInfos = $derived(
    await queryDocumentsDiffPageInfos([previousUid, params.uid]),
  )
  const { current, previous } = $derived(documentsDiffPageInfos)
</script>

{#if current === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      { label: `${m.assemblee_document_menu_trigger()} ${params.uid}` },
      { label: m.assemblee_document_diff_breadcrumb() },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >{m.assemblee_document_not_found({ uid: params.uid })}</Alert.Title
    >
  </Alert.Root>
{:else if current.documentSegmentation === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      {
        label: m.assemblee_dossier_menu_trigger(),
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: m.assemblee_document_diff_breadcrumb() },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >{m.assemblee_document_diff_missing_toc({
        title: current.document.titres.titrePrincipal,
      })}</Alert.Title
    >
  </Alert.Root>
{:else if previous === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      {
        label: m.assemblee_dossier_menu_trigger(),
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: m.assemblee_document_diff_breadcrumb() },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >{m.assemblee_document_not_found({ uid: previousUid })}</Alert.Title
    >
  </Alert.Root>
{:else if previous.documentSegmentation === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.assemblee_documents_list_breadcrumb_assemblee() },
      {
        label: m.assemblee_dossiers_list_breadcrumb_dossiers(),
        href: safeLocalizedHref("/assemblee/dossiers_legislatifs"),
      },
      {
        label: m.assemblee_dossier_menu_trigger(),
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: m.assemblee_document_diff_breadcrumb() },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >{m.assemblee_document_diff_missing_toc({
        title: previous.document.titres.titrePrincipal,
      })}</Alert.Title
    >
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
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: m.assemblee_document_diff_breadcrumb() },
    ]}
  />
  <DocumentsDiff {current} {previous} />
{/if}
