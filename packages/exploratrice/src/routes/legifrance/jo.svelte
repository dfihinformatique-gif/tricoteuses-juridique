<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import BookOpenIcon from "@lucide/svelte/icons/book-open"
  import FileTextIcon from "@lucide/svelte/icons/file-text"
  import ListIcon from "@lucide/svelte/icons/list"
  import ListOrderedIcon from "@lucide/svelte/icons/list-ordered"
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right"
  import {
    gitPathFromId,
    type Jo,
    type JoLienTxt,
    type JoTm,
  } from "@tricoteuses/legifrance"

  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { urlPathFromId } from "$lib/urls"
  import * as Card from "$lib/components/ui/card/index.js"
  import * as Accordion from "$lib/components/ui/accordion/index.js"

  let { jo }: { jo: Jo } = $props()

  const metaCommun = $derived(jo.META.META_COMMUN)
  const id = $derived(metaCommun.ID)
  const metaConteneur = $derived(jo.META.META_SPEC.META_CONTENEUR)
  const structureTxt = $derived(jo.STRUCTURE_TXT)

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })

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

{#snippet liensTxtView(liensTxt: JoLienTxt[], index: number, level: number = 0)}
  <ol
    class="list-inside list-decimal"
    start={index + 1}
    style="margin-left: {level}rem"
  >
    {#each liensTxt as lienTxt}
      {@const urlPath = urlPathFromId(lienTxt["@idtxt"])}
      <li class="my-2 marker:font-bold marker:text-primary">
        {#if urlPath === null}
          {lienTxt["@titretxt"]}
        {:else}
          <a href={urlPath} class="hover:underline">{lienTxt["@titretxt"]}</a>
        {/if}
      </li>
    {/each}
  </ol>
{/snippet}

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Journal officiel">
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
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://legal.tricoteuses.fr/jo/{id}"
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
          href={metaConteneur.NUM === undefined
            ? `https://www.legifrance.gouv.fr/jorf/jo/id/${id}`
            : `https://www.legifrance.gouv.fr/jorf/jo/${metaConteneur.DATE_PUBLI.replaceAll("-", "/")}/${`0000${metaConteneur.NUM}`.slice(-4)}`}
          target="_blank">Légifrance <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

{#snippet tmsView(tms: JoTm[], index: number, level = 0)}
  <Accordion.Root type="multiple">
    {#each iterTms(tms, index) as [tm, tmIndex]}
      <Accordion.Item>
        <Accordion.Trigger>
          <svelte:element
            this={`h${Math.min(level + 2, 6)}`}
            style="margin-left: {level}rem"
            class="flex items-center gap-2"
          >
            {#if level === 0}
              <BookOpenIcon size="18" class="text-primary" />
            {:else if level === 1}
              <FileTextIcon size="18" class="text-primary" />
            {:else if level === 2}
              <ListIcon size="18" class="text-primary" />
            {:else if level === 3}
              <ListOrderedIcon size="18" class="text-primary" />
            {:else}
              <ChevronRightIcon size="18" class="text-primary" />
            {/if}
            <span>{tm.TITRE_TM}</span>
          </svelte:element>
        </Accordion.Trigger>

        <Accordion.Content>
          {#if tm.LIEN_TXT !== undefined}
            {@render liensTxtView(tm.LIEN_TXT, tmIndex, level + 1)}
          {/if}

          {#if tm.TM !== undefined}
            {@render tmsView(
              tm.TM,
              tmIndex + (tm.LIEN_TXT === undefined ? 0 : tm.LIEN_TXT.length),
              level + 1,
            )}
          {/if}
        </Accordion.Content>
      </Accordion.Item>
    {/each}
  </Accordion.Root>
{/snippet}

<h1>
  {#if structureTxt?.TM !== undefined && structureTxt.TM.length === 1 && structureTxt.TM[0].LIEN_TXT === undefined}
    {structureTxt.TM[0].TITRE_TM}
    &mdash;
  {/if}
  {metaConteneur.TITRE}
</h1>

<Card.Root class="mb-10">
  <Card.Content>
    {#if structureTxt?.LIEN_TXT !== undefined}
      {@render liensTxtView(structureTxt.LIEN_TXT, 0)}
    {/if}
    {#if structureTxt?.TM !== undefined}
      {#if structureTxt.TM.length === 1 && structureTxt.TM[0].LIEN_TXT === undefined && structureTxt.TM[0].TM !== undefined}
        {@render tmsView(
          structureTxt.TM[0].TM,
          structureTxt.LIEN_TXT === undefined
            ? 0
            : structureTxt.LIEN_TXT.length,
        )}
      {:else}
        {@render tmsView(
          structureTxt.TM,
          structureTxt.LIEN_TXT === undefined
            ? 0
            : structureTxt.LIEN_TXT.length,
        )}
      {/if}
    {/if}
  </Card.Content>
</Card.Root>
