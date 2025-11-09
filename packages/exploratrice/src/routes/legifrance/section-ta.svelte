<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import {
    bestItemForDate,
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    slugify,
    walkContexteTexteTm,
    type JorfSectionTaTm,
    type LegiTexteNature,
    type LegiSectionTaTm,
    type JorfSectionTa,
    type LegiSectionTa,
  } from "@tricoteuses/legifrance"

  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { searchContext } from "$lib/hooks/search-context.svelte.js"

  import ContexteTexteTitre from "./contexte-texte-titre.svelte"
  import Structure from "./structure.svelte"
  import TmWithTitreArray from "./tm-with-titre-array.svelte"
  import TmWithTitreSingleton from "./tm-with-titre-singleton.svelte"

  let {
    displayMode = $bindable(),
    sectionTa,
    showIds = $bindable(),
  }: {
    displayMode: "links" | "references"
    sectionTa: JorfSectionTa | LegiSectionTa
    showIds: boolean
  } = $props()

  const id = $derived(sectionTa.ID)
  const texte = $derived(sectionTa.CONTEXTE.TEXTE)
  // TOOD: Improve date detection:
  const date = $derived(texte["@date_publi"]!)
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })

  $effect(() => {
    searchContext.legifranceTexteCid = texte["@cid"]

    return () => {
      // Caution: Don't use delete.
      searchContext.legifranceTexteCid = undefined
    }
  })
</script>

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Section">
    <DropdownMenu.Group>
      <DropdownMenu.Label>Affichage</DropdownMenu.Label>
      <DropdownMenu.RadioGroup bind:value={displayMode}>
        <DropdownMenu.RadioItem value="links">Liens</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="references"
          >Références sans liens</DropdownMenu.RadioItem
        >
      </DropdownMenu.RadioGroup>
      <DropdownMenu.CheckboxItem bind:checked={showIds}>
        Identifiants
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href={new URL(
            gitPathFromId(id, ".md"),
            "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
          ).toString()}
          target="_blank">Markdown dans git <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      {#if ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")}
        <DropdownMenu.Item>
          <a
            class="flex whitespace-nowrap"
            href={new URL(
              [
                ...(texte.TM === undefined
                  ? []
                  : walkContexteTexteTm(texte.TM)
                ).map((tm) => {
                  const titreTm = tm.TITRE_TM
                  const foundTitreTm = Array.isArray(titreTm)
                    ? bestItemForDate(titreTm, date)!
                    : titreTm
                  const sectionTaTitle =
                    foundTitreTm["#text"]?.replace(/\s+/g, " ").trim() ??
                    `Section sans titre ${foundTitreTm["@id"]}`
                  let sectionTaSlug = slugify(
                    sectionTaTitle.split(":")[0].trim(),
                    "_",
                  )
                  if (sectionTaSlug.length > 255) {
                    sectionTaSlug = sectionTaSlug.slice(0, 254)
                    if (sectionTaSlug.at(-1) !== "_") {
                      sectionTaSlug += "_"
                    }
                  }
                }),
                (() => {
                  const sectionTaTitle =
                    sectionTa.TITRE_TA?.replace(/\s+/g, " ").trim() ??
                    "Section sans titre"
                  let sectionTaSlug = slugify(
                    sectionTaTitle.split(":")[0].trim(),
                    "_",
                  )
                  if (sectionTaSlug.length > 255) {
                    sectionTaSlug = sectionTaSlug.slice(0, 254)
                    if (sectionTaSlug.at(-1) !== "_") {
                      sectionTaSlug += "_"
                    }
                  }
                  return sectionTaSlug
                })(),
                "README.md",
              ].join("/"),
              `https://git.tricoteuses.fr/${organizationNameByTexteNature[texte["@nature"] as LegiTexteNature]}/${repositoryNameFromTitle(foundTitreTxt?.["#text"] ?? foundTitreTxt?.["@c_titre_court"] ?? texte["@cid"]!)}/src/branch/main/`,
            ).toString()}
            target="_blank"
            >Markdown chronologique dans git <ExternalLinkIcon
              class="ml-1"
            /></a
          >
        </DropdownMenu.Item>
      {/if}
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://legal.tricoteuses.fr/section_ta/{id}"
          target="_blank">JSON augmenté <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href={new URL(
            gitPathFromId(id, ".json"),
            "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
          ).toString()}
          target="_blank">JSON dans git <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href={new URL(
            gitPathFromId(id, ".json"),
            "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
          ).toString()}
          target="_blank"
          >Références JSON dans git <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href={texte["@nature"] === "CODE"
            ? `https://www.legifrance.gouv.fr/codes/section_lc/${texte["@cid"]}/${id}`
            : `https://www.legifrance.gouv.fr/loda/id/${id}/`}
          target="_blank">Légifrance <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

<ContexteTexteTitre {date} {texte} />

{#if texte.TM !== undefined}
  {#if sectionTa.ID.startsWith("JORF")}
    <TmWithTitreSingleton tm={texte.TM as JorfSectionTaTm} />
  {:else}
    <TmWithTitreArray {date} tm={texte.TM as LegiSectionTaTm} />
  {/if}
{/if}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {sectionTa.TITRE_TA}
</h1>

{#if sectionTa.STRUCTURE_TA !== undefined}
  <Structure {displayMode} {showIds} structure={sectionTa.STRUCTURE_TA} />
{/if}
