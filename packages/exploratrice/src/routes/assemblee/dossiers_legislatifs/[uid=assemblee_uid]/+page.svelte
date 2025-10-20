<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { walkActes } from "@tricoteuses/assemblee"

  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryDossierParlementairePageInfos } from "../../dossier_parlementaire.remote"

  let { params } = $props()

  const dossierParlementairePageInfos = $derived(
    await queryDossierParlementairePageInfos(params.uid),
  )
  const { documentByUid, dossierParlementaire } = $derived(
    dossierParlementairePageInfos,
  )
</script>

{#snippet documentView(uid: string)}
  {@const document = documentByUid?.[uid]}
  <li>
    {#if document === undefined}
      Document {uid} non trouvé
    {:else}
      <a href={urlPathFromId(document.uid)}
        ><Badge>{document.denominationStructurelle}</Badge>
        {document.titres.titrePrincipal}</a
      >
    {/if}
  </li>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {dossierParlementaire.titreDossier.titre}
</h1>

<div class="mx-auto flex w-1/2 justify-end">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a href="https://assemblee.tricoteuses.fr/dossiers/{params.uid}"
            >JSON augmenté</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if dossierParlementaire.actesLegislatifs !== undefined}
  <ul>
    {#each walkActes(dossierParlementaire.actesLegislatifs) as acte}
      {#if acte.texteAssocieRef !== undefined}
        {@render documentView(acte.texteAssocieRef)}
      {/if}
      {#if acte.texteAdopteRef !== undefined}
        {@render documentView(acte.texteAdopteRef)}
      {/if}
    {/each}
  </ul>
{/if}
