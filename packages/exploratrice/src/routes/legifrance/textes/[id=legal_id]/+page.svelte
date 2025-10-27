<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import {
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    type JorfTexteVersion,
    type LegiTexteNature,
    type LegiTexteVersion,
  } from "@tricoteuses/legifrance"

  import { goto } from "$app/navigation"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { cleanHtmlContenu } from "$lib/strings"
  import { urlPathFromId } from "$lib/urls"

  import HtmlFragmentWithReferences from "../../HtmlFragmentWithReferences.svelte"
  import Structure from "../../Structure.svelte"
  import { queryTextePageInfos } from "../../texte.remote.js"
  import TexteSummary from "../../TexteSummary.svelte"

  let { params } = $props()

  const textePageInfos = $derived(await queryTextePageInfos(params.id))
  const {
    dossierLegislatifAssembleeUid,
    otherVersionsTextesVersions,
    textelr,
    texteVersion,
  } = $derived(textePageInfos)
  const abro = $derived(textePageInfos.abro ?? texteVersion?.ABRO?.CONTENU)
  let displayMode: "links" | "references" = $state("links")
  const espace = " "
  const metaCommun = $derived(texteVersion?.META.META_COMMUN)
  const metaTexteVersion = $derived(
    texteVersion?.META.META_SPEC.META_TEXTE_VERSION,
  )
  const nota = $derived(
    textePageInfos.nota ?? (texteVersion as LegiTexteVersion).NOTA?.CONTENU,
  )
  const notice = $derived(
    textePageInfos.notice ?? (texteVersion as JorfTexteVersion).NOTICE?.CONTENU,
  )
  let showIds = $state(false)
  const signataires = $derived(
    textePageInfos.signataires ??
      (texteVersion as LegiTexteVersion).SIGNATAIRES?.CONTENU,
  )
  const sm = $derived(
    textePageInfos.sm ?? (texteVersion as JorfTexteVersion).SM?.CONTENU,
  )
  const tp = $derived(textePageInfos.tp ?? texteVersion?.TP?.CONTENU)
  const versionsTextesVersions = $derived(
    sortTextesVersions(
      [texteVersion, ...otherVersionsTextesVersions].filter(
        (versionTexteVersion) => versionTexteVersion !== undefined,
      ),
    ).reverse(),
  )
  const visas = $derived(
    textePageInfos.visas ?? (texteVersion as LegiTexteVersion).VISAS?.CONTENU,
  )

  function sortTextesVersions(
    textesVersions: Array<JorfTexteVersion | LegiTexteVersion>,
  ): Array<JorfTexteVersion | LegiTexteVersion> {
    return textesVersions.toSorted((texteVersion1, texteVersion2) => {
      const metaTexteChronicle1 =
        texteVersion1.META.META_SPEC.META_TEXTE_CHRONICLE
      const metaTexteVersion1 = texteVersion1.META.META_SPEC.META_TEXTE_VERSION
      let dateDebut1 = metaTexteVersion1.DATE_DEBUT
      if (dateDebut1 === undefined || dateDebut1 === "2999-01-01") {
        dateDebut1 = metaTexteChronicle1.DATE_PUBLI
      }
      const metaTexteChronicle2 =
        texteVersion2.META.META_SPEC.META_TEXTE_CHRONICLE
      const metaTexteVersion2 = texteVersion2.META.META_SPEC.META_TEXTE_VERSION
      let dateDebut2 = metaTexteVersion2.DATE_DEBUT
      if (dateDebut2 === undefined || dateDebut2 === "2999-01-01") {
        dateDebut2 = metaTexteChronicle2.DATE_PUBLI
      }
      if (dateDebut1 !== dateDebut2) {
        return dateDebut1.localeCompare(dateDebut2)
      }
      const metaCommun1 = texteVersion1.META.META_COMMUN
      const origine1 = metaCommun1.ORIGINE
      const metaCommun2 = texteVersion2.META.META_COMMUN
      const origine2 = metaCommun2.ORIGINE
      if (origine1 !== origine2) {
        if (origine1 === "JORF") {
          return -1
        } else if (origine2 === "JORF") {
          return 1
        }
      }
      throw new Error(
        `Unable to sort texts ${metaCommun1.ID} & ${metaCommun2.ID} by date.`,
      )
    })
  }
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {metaTexteVersion?.TITREFULL}
</h1>

<div class="mx-auto my-6 flex justify-center space-x-2">
  {#if texteVersion !== undefined}
    <Select.Root
      onValueChange={(id: string) => goto(urlPathFromId(id)!)}
      type="single"
      value={params.id}
    >
      <Select.Trigger>
        <TexteSummary {texteVersion} displayMode="version" {showIds} />
      </Select.Trigger>
      <Select.Content>
        {#each versionsTextesVersions as versionTexteVersion}
          <Select.Item value={versionTexteVersion.META.META_COMMUN.ID}>
            <TexteSummary
              texteVersion={versionTexteVersion}
              displayMode="version"
              {showIds}
            />
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  {/if}

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
        <DropdownMenu.CheckboxItem bind:checked={showIds}>
          Identifiants
        </DropdownMenu.CheckboxItem>
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
        {#if metaCommun !== undefined && metaTexteVersion !== undefined && ["CODE", "CONSTITUTION", "DECLARATION"].includes(metaCommun.NATURE ?? "")}
          <DropdownMenu.Item>
            <a
              href={new URL(
                "README.md",
                `https://git.tricoteuses.fr/${organizationNameByTexteNature[metaCommun.NATURE as LegiTexteNature]}/${repositoryNameFromTitle(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? metaCommun.ID)}/src/branch/main/`,
              ).toString()}>Markdown chronologique dans git</a
            >
            <ExternalLinkIcon />
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item>
          <a href="https://legal.tricoteuses.fr/texte_version/{params.id}"
            >JSON augmenté de TEXTE_VERSION</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a href="https://legal.tricoteuses.fr/textelr/{params.id}"
            >JSON augmenté de TEXTELR</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
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
            href={metaCommun !== undefined && metaCommun.NATURE === "CODE"
              ? `https://www.legifrance.gouv.fr/codes/texte_lc/${params.id}`
              : `https://www.legifrance.gouv.fr/loda/id/${params.id}/`}
            >Légifrance</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        {#if dossierLegislatifAssembleeUid !== undefined}
          <DropdownMenu.Item>
            <a href={urlPathFromId(dossierLegislatifAssembleeUid)}
              >Dossier législatif de l'Assemblée</a
            >
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if abro !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(abro)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.ABRO!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if notice !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(notice)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).NOTICE!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if sm !== undefined}
  <h2>Résumé</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(sm)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).SM!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if visas !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(visas)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.VISAS!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if textelr?.STRUCT !== undefined}
  <Structure {displayMode} {showIds} structure={textelr.STRUCT} />
{/if}

{#if signataires !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(signataires)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).SIGNATAIRES!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(nota)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).NOTA!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if tp !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(tp)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.TP!.CONTENU!} />
    </section>
  {/if}
{/if}
