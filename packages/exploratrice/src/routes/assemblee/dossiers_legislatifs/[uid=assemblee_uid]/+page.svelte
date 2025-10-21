<script lang="ts">
  import BadgeCheckIcon from "@lucide/svelte/icons/badge-check"
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { walkActes, type ActeLegislatif } from "@tricoteuses/assemblee"

  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { fullDateFormatter } from "$lib/dates"
  import { capitalizeFirstLetter } from "$lib/strings"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryDossierParlementairePageInfos } from "../../dossier_parlementaire.remote"

  let { params } = $props()

  const dossierParlementairePageInfos = $derived(
    await queryDossierParlementairePageInfos(params.uid),
  )
  const { documentByUid, dossierParlementaire, legifranceTexteId } = $derived(
    dossierParlementairePageInfos,
  )
</script>

{#snippet documentView(acte: ActeLegislatif, uid: string)}
  {@const document = documentByUid?.[uid]}
  <li>
    {#if document === undefined}
      <Badge variant="secondary"
        >{acte.dateActe === undefined
          ? "date inconnue"
          : fullDateFormatter(acte.dateActe)}</Badge
      > Document {uid} non trouvé
    {:else}
      {@const chrono = document.cycleDeVie.chrono}
      {@const date =
        acte.dateActe ??
        chrono.datePublication ??
        chrono.datePublicationWeb ??
        chrono.dateDepot ??
        chrono.dateCreation}
      <a href={urlPathFromId(document.uid)}
        ><Badge variant="secondary"
          >{date === undefined
            ? "date inconnue"
            : fullDateFormatter(date)}</Badge
        >
        {capitalizeFirstLetter(document.titres.titrePrincipal)}
        <Badge variant="outline">{document.denominationStructurelle}</Badge></a
      >
    {/if}
  </li>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {dossierParlementaire.titreDossier.titre}
  <Badge variant="outline"
    >{dossierParlementaire.procedureParlementaire.libelle}</Badge
  >
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
        {#if dossierParlementaire.titreDossier.titreChemin !== undefined}
          <DropdownMenu.Item>
            <a
              href="https://www.assemblee-nationale.fr/dyn/{dossierParlementaire.legislature}/dossiers/{dossierParlementaire
                .titreDossier.titreChemin}">Assemblée nationale</a
            >
            <ExternalLinkIcon />
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if dossierParlementaire.actesLegislatifs !== undefined}
  <ul>
    {#each walkActes(dossierParlementaire.actesLegislatifs) as acte}
      {#if acte.texteAssocieRef !== undefined}
        {@render documentView(acte, acte.texteAssocieRef)}
      {/if}
      {#if acte.texteAdopteRef !== undefined}
        {@render documentView(acte, acte.texteAdopteRef)}
      {/if}
    {/each}

    {#each walkActes(dossierParlementaire.actesLegislatifs) as acte}
      {#if acte.infoJo?.urlLegifrance !== undefined}
        <a
          href={legifranceTexteId === undefined
            ? acte.infoJo.urlLegifrance
            : urlPathFromId(legifranceTexteId)}
          ><Badge
            class="bg-green-500 text-white dark:bg-green-600"
            variant="secondary"
            >{acte.dateActe === undefined
              ? "date inconnue"
              : fullDateFormatter(acte.dateActe)}</Badge
          >
          Loi n°{acte.codeLoi} du {fullDateFormatter(acte.dateActe!)}
          {acte.titreLoi}
          <Badge
            class="bg-green-500 text-white dark:bg-green-600"
            variant="secondary"
          >
            <BadgeCheckIcon />
            Loi promulguée
          </Badge></a
        >
      {/if}
    {/each}
  </ul>
{/if}
