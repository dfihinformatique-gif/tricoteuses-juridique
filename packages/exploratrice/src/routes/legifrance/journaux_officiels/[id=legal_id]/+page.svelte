<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { safeLocalizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  import { queryJo } from "../../jo.remote"
  import Jo from "../../jo.svelte"

  let { params } = $props()

  const jo = $derived(await queryJo(params.id))
</script>

{#if jo === undefined}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_jo_list_breadcrumb(), href: safeLocalizedHref("/legifrance/journaux_officiels") },
      { label: `${m.legifrance_jo_menu_trigger()} ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.error_not_found({ item: `${m.legifrance_jo_menu_trigger()} ${params.id}` })}</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_jo_list_breadcrumb(), href: safeLocalizedHref("/legifrance/journaux_officiels") },
      { label: jo.META?.META_COMMUN.ID ?? `${m.legifrance_jo_menu_trigger()} ${params.id}` },
    ]}
  />
  <Jo {jo} />
{/if}
