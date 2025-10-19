<script lang="ts">
  import { walkActes } from "@tricoteuses/assemblee"

  import { Badge } from "$lib/components/ui/badge/index.js"
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
