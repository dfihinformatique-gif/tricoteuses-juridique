<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"

  import { queryJo } from "../../jo.remote"
  import Jo from "../../jo.svelte"

  let { params } = $props()

  const jo = $derived(await queryJo(params.id))
</script>

{#if jo === undefined}
  <PageBreadcrumb
    segments={[
      { label: "Journaux officiels", href: "/legifrance/journaux_officiels" },
      { label: `Journal officiel ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Journal officiel {params.id} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: "Journaux officiels", href: "/legifrance/journaux_officiels" },
      { label: jo.META?.META_COMMUN.ID ?? `Journal officiel ${params.id}` },
    ]}
  />
  <Jo {jo} />
{/if}
