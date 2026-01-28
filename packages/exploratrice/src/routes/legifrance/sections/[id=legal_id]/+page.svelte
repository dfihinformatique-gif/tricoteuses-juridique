<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"

  import { querySectionTa } from "../../section-ta.remote.js"
  import SectionTa from "../../section-ta.svelte"

  let { params } = $props()

  let displayMode: "links" | "references" = $state("links")
  const sectionTa = $derived(await querySectionTa(params.id))
  let showIds = $state(false)
</script>

{#if sectionTa === undefined}
  <PageBreadcrumb
    segments={[
      { label: "Textes promulgués", href: "/legifrance/textes" },
      { label: `Section ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Section texte article {params.id} non trouvée !</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: "Textes promulgués", href: "/legifrance/textes" },
      {
        label: "Texte",
        href: sectionTa.CONTEXTE.TEXTE["@cid"]
          ? (urlPathFromId(sectionTa.CONTEXTE.TEXTE["@cid"]) ?? undefined)
          : undefined,
      },
      {
        label:
          (typeof sectionTa.TITRE_TA === "object" && sectionTa.TITRE_TA !== null
            ? String(
                (sectionTa.TITRE_TA as Record<string, unknown>)["#text"] ?? "",
              )
            : sectionTa.TITRE_TA) || `Section ${params.id}`,
      },
    ]}
  />
  <SectionTa bind:displayMode {sectionTa} bind:showIds />
{/if}
