<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
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
  } from "@tricoteuses/legifrance"

  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"

  import ContexteTexteTitre from "../../ContexteTexteTitre.svelte"
  import { querySectionTa } from "../../section_ta.remote.js"
  import Structure from "../../Structure.svelte"
  import TmWithTitreSingleton from "../../TmWithTitreSingleton.svelte"
  import TmWithTitreArray from "../../TmWithTitreArray.svelte"

  let { params } = $props()

  let displayMode: "links" | "references" = $state("links")
  const sectionTa = $derived(await querySectionTa(params.id))
  const texte = $derived(sectionTa.CONTEXTE.TEXTE)
  // TOOD: Improve date detection:
  const date = $derived(texte["@date_publi"]!)
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))
</script>

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

<div class="mx-auto flex w-1/2 justify-end">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Affichage</DropdownMenu.Label>
        <DropdownMenu.RadioGroup bind:value={displayMode}>
          <DropdownMenu.RadioItem value="links">Liens</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="references"
            >Références sans liens</DropdownMenu.RadioItem
          >
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(params.id, ".md"),
              "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
            ).toString()}>Markdown dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        {#if ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")}
          <DropdownMenu.Item>
            <a
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
              ).toString()}>Markdown chronologique dans git</a
            >
            <ExternalLinkIcon />
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(params.id, ".json"),
              "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
            ).toString()}>JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(params.id, ".json"),
              "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
            ).toString()}>Références JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={texte["@nature"] === "CODE"
              ? `https://www.legifrance.gouv.fr/codes/section_lc/${texte["@cid"]}/${params.id}`
              : `https://www.legifrance.gouv.fr/loda/id/${params.id}/`}
            >Légifrance</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if sectionTa.STRUCTURE_TA !== undefined}
  <Structure {displayMode} structure={sectionTa.STRUCTURE_TA} />
{/if}
