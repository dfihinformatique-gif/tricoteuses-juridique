<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import type { Attachment } from "svelte/attachments"

  import { page } from "$app/state"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { urlPathFromId } from "$lib/urls.js"

  import type { DocumentPageInfos } from "./documents"

  let {
    document,
    /* documentFileInfos, */ /* documentFilesIndex, */ documentHtml,
  }: DocumentPageInfos = $props()

  const { chrono } = $derived(document.cycleDeVie)
  const date = $derived(
    chrono.datePublication ??
      chrono.datePublicationWeb ??
      chrono.dateDepot ??
      chrono.dateCreation,
  )
  const linkUrlOriginReplacement = $derived(page.data.linkUrlOriginReplacement)

  const attachDocumentHtml: Attachment = (element) => {
    const shadow = element.attachShadow({ mode: "open" })
    shadow.innerHTML =
      linkUrlOriginReplacement === undefined
        ? documentHtml
        : documentHtml.replaceAll(
            "https://tricoteuses.fr",
            linkUrlOriginReplacement,
          )

    return () => {
      // Cleaning up
    }
  }
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  <Badge variant="secondary"
    >{date === undefined ? "date inconnue" : fullDateFormatter(date)}</Badge
  >
  {document.titres.titrePrincipal}
  <Badge variant="outline">{document.denominationStructurelle}</Badge>
</h1>

<div class="mx-auto flex w-1/2 justify-end">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Voir aussi</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a href={urlPathFromId(document.dossierRef)}>Dossier législatif</a>
        </DropdownMenu.Item>
      </DropdownMenu.Group>
      <DropdownMenu.Group>
        <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a href="https://assemblee.tricoteuses.fr/documents/{document.uid}"
            >JSON augmenté</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

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
