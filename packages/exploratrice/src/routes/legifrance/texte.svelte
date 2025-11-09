<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import {
    getTexteVersionDateDebut,
    sortTextesVersionsByDate,
  } from "@tricoteuses/tisseuse"
  import {
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    type JorfTexteVersion,
    type LegiTexteNature,
    type LegiTexteVersion,
  } from "@tricoteuses/legifrance"

  import { goto } from "$app/navigation"
  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { searchContext } from "$lib/hooks/search-context.svelte.js"
  import { urlPathFromId } from "$lib/urls.js"

  import HtmlFragmentWithLinks from "./html-fragment-with-links.svelte"
  import HtmlFragmentWithReferences from "./html-fragment-with-references.svelte"
  import Structure from "./structure.svelte"
  import type { TextePageInfos } from "./texte.js"
  import TexteSummary from "./texte-summary.svelte"

  let {
    textePageInfos,
    displayMode = $bindable(),
    showIds = $bindable(),
  }: {
    textePageInfos: TextePageInfos
    displayMode: "links" | "references"
    showIds: boolean
  } = $props()

  const {
    dossierLegislatifAssembleeUid,
    otherVersionsTextesVersions,
    textelr,
    texteVersion,
  } = $derived(textePageInfos)
  const abro = $derived(textePageInfos.abro ?? texteVersion.ABRO?.CONTENU)

  const metaCommun = $derived(texteVersion.META.META_COMMUN)
  const id = $derived(metaCommun.ID)
  const metaTexteChronicle = $derived(
    texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE,
  )
  const metaTexteVersion = $derived(
    texteVersion.META.META_SPEC.META_TEXTE_VERSION,
  )
  const nota = $derived(
    textePageInfos.nota ?? (texteVersion as LegiTexteVersion).NOTA?.CONTENU,
  )
  const notice = $derived(
    textePageInfos.notice ?? (texteVersion as JorfTexteVersion).NOTICE?.CONTENU,
  )
  const signataires = $derived(
    textePageInfos.signataires ??
      (texteVersion as LegiTexteVersion).SIGNATAIRES?.CONTENU,
  )
  const sm = $derived(
    textePageInfos.sm ?? (texteVersion as JorfTexteVersion).SM?.CONTENU,
  )
  const tp = $derived(textePageInfos.tp ?? texteVersion.TP?.CONTENU)
  const versionsTextesVersions = $derived(
    [texteVersion, ...otherVersionsTextesVersions]
      .filter((versionTexteVersion) => versionTexteVersion !== undefined)
      .sort(sortTextesVersionsByDate(getTexteVersionDateDebut))
      .reverse(),
  )
  const visas = $derived(
    textePageInfos.visas ?? (texteVersion as LegiTexteVersion).VISAS?.CONTENU,
  )

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })

  $effect(() => {
    searchContext.legifranceTexteCid = metaTexteChronicle.CID

    return () => {
      // Caution: Don't use delete.
      searchContext.legifranceTexteCid = undefined
    }
  })
</script>

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Texte">
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
    {#if dossierLegislatifAssembleeUid !== undefined}
      <DropdownMenu.Group>
        <DropdownMenu.Label>Voir aussi</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a href={urlPathFromId(dossierLegislatifAssembleeUid)}
            >Dossier législatif de l'Assemblée</a
          >
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    {/if}
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
      {#if metaCommun !== undefined && metaTexteVersion !== undefined && ["CODE", "CONSTITUTION", "DECLARATION"].includes(metaCommun.NATURE ?? "")}
        <DropdownMenu.Item>
          <a
            class="flex whitespace-nowrap"
            href={new URL(
              "README.md",
              `https://git.tricoteuses.fr/${organizationNameByTexteNature[metaCommun.NATURE as LegiTexteNature]}/${repositoryNameFromTitle(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? metaCommun.ID)}/src/branch/main/`,
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
          href="https://legal.tricoteuses.fr/texte_version/{id}"
          target="_blank"
          >JSON augmenté de TEXTE_VERSION <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://legal.tricoteuses.fr/textelr/{id}"
          target="_blank"
          >JSON augmenté de TEXTELR <ExternalLinkIcon class="ml-1" /></a
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
          href={metaCommun !== undefined && metaCommun.NATURE === "CODE"
            ? `https://www.legifrance.gouv.fr/codes/texte_lc/${id}`
            : `https://www.legifrance.gouv.fr/loda/id/${id}/`}
          target="_blank">Légifrance <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {metaTexteVersion?.TITREFULL}
</h1>

<div class="mx-auto my-6 flex justify-center">
  <Select.Root
    onValueChange={(id: string) =>
      goto(urlPathFromId(id)!, { keepFocus: true, noScroll: true })}
    type="single"
    value={id}
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
</div>

{#if abro !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={abro} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.ABRO!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if notice !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={notice} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).NOTICE!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if sm !== undefined}
  <h2>Résumé</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={sm} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).SM!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if visas !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={visas} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.VISAS!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if textelr?.STRUCT !== undefined}
  <section class="my-4">
    <Structure {displayMode} {showIds} structure={textelr.STRUCT} />
  </section>
{/if}

{#if signataires !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={signataires} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).SIGNATAIRES!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={nota} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).NOTA!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if tp !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links mx-4">
      <HtmlFragmentWithLinks fragment={tp} />
    </section>
  {:else}
    <section class="prose mx-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.TP!.CONTENU!} />
    </section>
  {/if}
{/if}
