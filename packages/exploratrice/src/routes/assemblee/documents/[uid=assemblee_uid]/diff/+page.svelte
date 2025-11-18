<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

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
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {params.uid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else if current.documentSegmentation === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >Sommaire manquand dans "{current.document.titres.titrePrincipal}" !</Alert.Title
    >
  </Alert.Root>
{:else if previous === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Document {previousUid} non trouvé !</Alert.Title>
  </Alert.Root>
{:else if previous.documentSegmentation === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title
      >Sommaire manquand dans "{previous.document.titres.titrePrincipal}" !</Alert.Title
    >
  </Alert.Root>
{:else}
  <DocumentsDiff {current} {previous} />
{/if}
