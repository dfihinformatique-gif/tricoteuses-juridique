<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"

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
      {
        label: "Dossiers législatifs",
        href: "/assemblee/dossiers_legislatifs",
      },
      { label: `Document ${params.uid}` },
      { label: "Diff" },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {params.uid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else if current.documentSegmentation === undefined}
  <PageBreadcrumb
    segments={[
      {
        label: "Dossiers législatifs",
        href: "/assemblee/dossiers_legislatifs",
      },
      {
        label: "Dossier législatif",
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: "Diff" },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >Sommaire manquand dans "{current.document.titres.titrePrincipal}" !</Alert.Title
    >
  </Alert.Root>
{:else if previous === undefined}
  <PageBreadcrumb
    segments={[
      {
        label: "Dossiers législatifs",
        href: "/assemblee/dossiers_legislatifs",
      },
      {
        label: "Dossier législatif",
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: "Diff" },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {previousUid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else if previous.documentSegmentation === undefined}
  <PageBreadcrumb
    segments={[
      {
        label: "Dossiers législatifs",
        href: "/assemblee/dossiers_legislatifs",
      },
      {
        label: "Dossier législatif",
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: "Diff" },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >Sommaire manquand dans "{previous.document.titres.titrePrincipal}" !</Alert.Title
    >
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      {
        label: "Dossiers législatifs",
        href: "/assemblee/dossiers_legislatifs",
      },
      {
        label: "Dossier législatif",
        href: urlPathFromId(current.document.dossierRef) ?? undefined,
      },
      {
        label: current.document.titres.titrePrincipal,
        href: urlPathFromId(params.uid) ?? undefined,
      },
      { label: "Diff" },
    ]}
  />
  <DocumentsDiff {current} {previous} />
{/if}
