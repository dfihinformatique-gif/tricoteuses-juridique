<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import { queryTextePageInfos } from "../../texte.remote.js"
  import Texte from "../../texte.svelte"

  let { params } = $props()

  const textePageInfos = $derived(await queryTextePageInfos(params.id))
  let displayMode: "links" | "references" = $state("links")
  let showIds = $state(false)
</script>

{#if textePageInfos === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_textes_list_breadcrumb(), href: safeLocalizedHref("/legifrance/textes") },
      { label: `${m.legifrance_texte_menu_trigger()} ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.error_not_found({ item: `${m.legifrance_texte_menu_trigger()} ${params.id}` })}</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_textes_list_breadcrumb(), href: safeLocalizedHref("/legifrance/textes") },
      {
        label:
          textePageInfos.texteVersion.META.META_SPEC.META_TEXTE_VERSION
            .TITREFULL ?? "",
      },
    ]}
  />
  <Texte bind:displayMode bind:showIds {textePageInfos} />
{/if}
