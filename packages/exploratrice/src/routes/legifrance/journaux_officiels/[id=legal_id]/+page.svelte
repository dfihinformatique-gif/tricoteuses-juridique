<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import {
    gitPathFromId,
    type JoLienTxt,
    type JoTm,
  } from "@tricoteuses/legifrance"

  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { urlPathFromId } from "$lib/urls"

  import { queryJo } from "../../jo.remote.js"

  let { params } = $props()

  const jo = $derived(await queryJo(params.id))
  // const metaCommun = $derived(jo.META.META_COMMUN)
  const metaConteneur = $derived(jo.META.META_SPEC.META_CONTENEUR)
  const structureTxt = $derived(jo.STRUCTURE_TXT)

  const getTmDeepSize = (tm: JoTm): number =>
    (tm.TM ?? []).reduce(
      (sum, tm) => sum + getTmDeepSize(tm),
      tm.LIEN_TXT === undefined ? 0 : tm.LIEN_TXT.length,
    )

  function* iterTms(
    tms: JoTm[],
    index: number,
  ): Generator<[JoTm, number], void> {
    for (const tm of tms) {
      yield [tm, index]
      index += getTmDeepSize(tm)
    }
  }
</script>

{#snippet liensTxtView(liensTxt: JoLienTxt[], index: number)}
  <ol class="list-inside list-decimal" start={index + 1}>
    {#each liensTxt as lienTxt}
      {@const urlPath = urlPathFromId(lienTxt["@idtxt"])}
      <li class="ml-4">
        {#if urlPath === null}
          {lienTxt["@titretxt"]}
        {:else}
          <a href={urlPath}>{lienTxt["@titretxt"]}</a>
        {/if}
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet tmsView(tms: JoTm[], index: number, level = 0)}
  {#each iterTms(tms, index) as [tm, tmIndex]}
    <svelte:element
      this={`h${Math.min(level + 2, 6)}`}
      style="margin-left: {level}rem">{tm.TITRE_TM}</svelte:element
    >
    {#if tm.LIEN_TXT !== undefined}
      {@render liensTxtView(tm.LIEN_TXT, tmIndex)}
    {/if}
    {#if tm.TM !== undefined}
      {@render tmsView(
        tm.TM,
        tmIndex + (tm.LIEN_TXT === undefined ? 0 : tm.LIEN_TXT.length),
        level + 1,
      )}
    {/if}
  {/each}
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {#if structureTxt?.TM !== undefined && structureTxt.TM.length === 1 && structureTxt.TM[0].LIEN_TXT === undefined}
    {structureTxt.TM[0].TITRE_TM}
    <br />
  {/if}
  {metaConteneur.TITRE}
</h1>

<div class="mx-auto flex w-1/2 justify-end">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
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
            href={metaConteneur.NUM === undefined
              ? `https://www.legifrance.gouv.fr/jorf/jo/id/${params.id}`
              : `https://www.legifrance.gouv.fr/jorf/jo/${metaConteneur.DATE_PUBLI.replaceAll("-", "/")}/${`0000${metaConteneur.NUM}`.slice(-4)}`}
            >Légifrance</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if structureTxt?.LIEN_TXT !== undefined}
  {@render liensTxtView(structureTxt.LIEN_TXT, 0)}
{/if}
{#if structureTxt?.TM !== undefined}
  {#if structureTxt.TM.length === 1 && structureTxt.TM[0].LIEN_TXT === undefined && structureTxt.TM[0].TM !== undefined}
    {@render tmsView(
      structureTxt.TM[0].TM,
      structureTxt.LIEN_TXT === undefined ? 0 : structureTxt.LIEN_TXT.length,
    )}
  {:else}
    {@render tmsView(
      structureTxt.TM,
      structureTxt.LIEN_TXT === undefined ? 0 : structureTxt.LIEN_TXT.length,
    )}
  {/if}
{/if}
