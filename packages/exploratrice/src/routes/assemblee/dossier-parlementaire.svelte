<script lang="ts">
  import BadgeCheckIcon from "@lucide/svelte/icons/badge-check"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { walkActes, type ActeLegislatif } from "@tricoteuses/assemblee"

  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { fullDateFormatter } from "$lib/dates"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { capitalizeFirstLetter } from "$lib/strings"
  import { urlPathFromId } from "$lib/urls.js"

  import type { DossierParlementairePageInfos } from "./dossiers-parlementaires.js"

  let {
    documentByUid,
    dossierParlementaire,
    legifranceTexteId,
  }: DossierParlementairePageInfos = $props()

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })
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

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Dossier législatif">
    <DropdownMenu.Group>
      <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://assemblee.tricoteuses.fr/dossiers/{dossierParlementaire.uid}"
          target="_blank">JSON augmenté <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      {#if dossierParlementaire.titreDossier.titreChemin !== undefined}
        <DropdownMenu.Item>
          <a
            class="flex whitespace-nowrap"
            href="https://www.assemblee-nationale.fr/dyn/{dossierParlementaire.legislature}/dossiers/{dossierParlementaire
              .titreDossier.titreChemin}"
            target="_blank"
            >Assemblée nationale <ExternalLinkIcon class="ml-1" /></a
          >
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {dossierParlementaire.titreDossier.titre}
  <Badge variant="outline"
    >{dossierParlementaire.procedureParlementaire.libelle}</Badge
  >
</h1>

{#if dossierParlementaire.actesLegislatifs !== undefined}
  <ul>
    {#each walkActes(dossierParlementaire.actesLegislatifs) as acte}
      {#if acte.texteAdopteRef !== undefined}
        {@render documentView(acte, acte.texteAdopteRef)}
      {/if}
      {#if acte.texteAssocieRef !== undefined}
        {@render documentView(acte, acte.texteAssocieRef)}
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
