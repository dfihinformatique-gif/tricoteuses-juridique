<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

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
      { label: m.legifrance_textes_list_breadcrumb(), href: safeLocalizedHref("/legifrance/textes") },
      { label: `${m.legifrance_section_menu_trigger()} ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.error_not_found({ item: `${m.legifrance_section_menu_trigger()} ${params.id}` })}</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_textes_list_breadcrumb(), href: safeLocalizedHref("/legifrance/textes") },
      {
        label: m.legifrance_texte_menu_trigger(),
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
            : sectionTa.TITRE_TA) || `${m.legifrance_section_menu_trigger()} ${params.id}`,
      },
    ]}
  />
  <SectionTa bind:displayMode {sectionTa} bind:showIds />
{/if}
