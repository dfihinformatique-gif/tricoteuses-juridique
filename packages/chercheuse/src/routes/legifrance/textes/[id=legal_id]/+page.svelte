<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { error } from "@sveltejs/kit"
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
  import { Label } from "$lib/components/ui/label/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { urlPathFromId } from "$lib/urls"

  import HtmlFragmentWithReferences from "../../HtmlFragmentWithReferences.svelte"
  import Structure from "../../Structure.svelte"
  import { queryTexteWithLinks } from "../../texte.remote.js"

  let { params } = $props()

  const texteWithLinks = $derived(
    (await queryTexteWithLinks(params.id)) ?? error(404, "Texte non trouvé"),
  )
  const { textelr, texteVersion } = $derived(texteWithLinks)
  const abro = $derived(texteWithLinks.abro ?? texteVersion?.ABRO?.CONTENU)
  let displayMode: "links" | "references" = $state("links")
  const metaCommun = $derived(texteVersion?.META.META_COMMUN)
  const metaTexteVersion = $derived(
    texteVersion?.META.META_SPEC.META_TEXTE_VERSION,
  )
  const nota = $derived(
    texteWithLinks.nota ?? (texteVersion as LegiTexteVersion).NOTA?.CONTENU,
  )
  const notice = $derived(
    texteWithLinks.notice ?? (texteVersion as JorfTexteVersion).NOTICE?.CONTENU,
  )
  const signataires = $derived(
    texteWithLinks.signataires ??
      (texteVersion as LegiTexteVersion).SIGNATAIRES?.CONTENU,
  )
  const sm = $derived(
    texteWithLinks.sm ?? (texteVersion as JorfTexteVersion).SM?.CONTENU,
  )
  const tp = $derived(texteWithLinks.tp ?? texteVersion?.TP?.CONTENU)
  const versions = $derived(textelr?.VERSIONS.VERSION)
  const visas = $derived(
    texteWithLinks.visas ?? (texteVersion as LegiTexteVersion).VISAS?.CONTENU,
  )
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}
</h1>

<div class="mx-auto flex w-1/2 justify-between">
  <div class="flex space-x-1">
    {#if versions !== undefined}
      <Label for="versions">Versions</Label>
      <Select.Root
        onValueChange={(id: string) => goto(urlPathFromId(id)!)}
        type="single"
      >
        <Select.Trigger id="versions"
          >{params.id}
          {metaTexteVersion?.DATE_DEBUT} - {metaTexteVersion?.DATE_FIN}</Select.Trigger
        >
        <Select.Content>
          {#each versions as version}
            {@const lien = version.LIEN_TXT}
            <Select.Item value={lien["@id"]}
              >{lien["@id"]}
              {lien["@debut"]} - {lien["@fin"]}</Select.Item
            >
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}
  </div>
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
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if abro !== undefined}
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html abro}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.ABRO!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if notice !== undefined}
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html notice}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).NOTICE!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if sm !== undefined}
  <h2>Résumé</h2>
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html sm}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as JorfTexteVersion).SM!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if visas !== undefined}
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html visas}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.VISAS!.CONTENU!} />
    </section>
  {/if}
{/if}

{#if textelr?.STRUCT !== undefined}
  <Structure {displayMode} structure={textelr.STRUCT} />
{/if}

{#if signataires !== undefined}
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html signataires}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).SIGNATAIRES!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html nota}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences
        fragment={(texteVersion as LegiTexteVersion).NOTA!.CONTENU!}
      />
    </section>
  {/if}
{/if}

{#if tp !== undefined}
  {#if displayMode === "links"}
    <section class="prose ml-4">
      {@html tp}
    </section>
  {:else}
    <section class="prose ml-4">
      <HtmlFragmentWithReferences fragment={texteVersion!.TP!.CONTENU!} />
    </section>
  {/if}
{/if}
