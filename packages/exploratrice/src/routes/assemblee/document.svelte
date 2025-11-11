<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { slugify } from "@tricoteuses/legifrance"
  import type {
    TableOfContentsPositioned,
    TableOfContentsDivisionPositioned,
  } from "@tricoteuses/tisseuse"
  import type { Attachment } from "svelte/attachments"

  import { page } from "$app/state"
  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as Collapsible from "$lib/components/ui/collapsible/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { urlPathFromId } from "$lib/urls.js"

  import type { DocumentPageInfos } from "./documents"

  let {
    document,
    // documentFileInfos,
    // documentFilesIndex,
    documentHtml,
    documentSegmentation,
  }: DocumentPageInfos = $props()

  const { chrono } = $derived(document.cycleDeVie)
  const date = $derived(
    chrono.datePublication ??
      chrono.datePublicationWeb ??
      chrono.dateDepot ??
      chrono.dateCreation,
  )
  const linkUrlOriginReplacement = $derived(page.data.linkUrlOriginReplacement)
  let shadowHost: Element | undefined = $state(undefined)

  $effect(() => {
    const hash = page.url.hash.slice(1)
    if (hash.startsWith("tricoteuses-") && shadowHost?.shadowRoot != null) {
      const element = shadowHost.shadowRoot.getElementById(hash)
      if (element !== null) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    }
  })

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })

  const attachDocumentHtml: Attachment = (element) => {
    const shadowRoot = element.attachShadow({ mode: "open" })
    shadowRoot.innerHTML =
      linkUrlOriginReplacement === undefined
        ? documentHtml
        : documentHtml.replaceAll(
            "https://tricoteuses.fr",
            linkUrlOriginReplacement,
          )
    shadowHost = element

    return () => {
      // Cleaning up.
      shadowHost = undefined
    }
  }
</script>

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Document">
    <DropdownMenu.Group>
      <DropdownMenu.Label>Voir aussi</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a href={urlPathFromId(document.dossierRef)}>Dossier législatif</a>
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://assemblee.tricoteuses.fr/documents/{document.uid}"
          target="_blank">JSON augmenté <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

{#snippet segmentationView({
  articles,
  divisions,
}: TableOfContentsPositioned | TableOfContentsDivisionPositioned)}
  <ul class="ml-4 list-outside list-disc">
    {#if articles !== undefined}
      <li>
        {#each articles as article, index}{#if index > 0},{/if}
          <a class="link" href="#tricoteuses-{slugify(article.line)}"
            >{article.line}</a
          >
        {/each}
      </li>
    {/if}
    {#if divisions !== undefined}
      {#each divisions as division}
        <li>
          <span>{division.line}</span>
          {@render segmentationView(division)}
        </li>
      {/each}
    {/if}
  </ul>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  <Badge variant="secondary"
    >{date === undefined ? "date inconnue" : fullDateFormatter(date)}</Badge
  >
  {document.titres.titrePrincipal}
  <Badge variant="outline">{document.denominationStructurelle}</Badge>
</h1>

{#if documentSegmentation !== undefined}
  <Collapsible.Root>
    <Collapsible.Trigger>Sommaire</Collapsible.Trigger>
    <Collapsible.Content>
      {@render segmentationView(documentSegmentation)}
    </Collapsible.Content>
  </Collapsible.Root>
{/if}

<!--
Note: shadowrootmode="open" doesn't currently work in Svelte when rendered on the client.
(but it works when rendered on the server).
When bug https://github.com/sveltejs/svelte/issues/13271 is closed, remove the comment and
delete the article with @attach function below.
<article>
  <template shadowrootmode="open">
    {@html documentHtml}
  </template>
</article>
-->
<article {@attach attachDocumentHtml}></article>
