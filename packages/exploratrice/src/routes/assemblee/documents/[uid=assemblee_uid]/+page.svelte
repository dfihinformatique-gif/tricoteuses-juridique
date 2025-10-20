<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"

  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"

  import { queryDocumentPageInfos } from "../../document.remote.js"

  let { params } = $props()

  const documentPageInfos = $derived(await queryDocumentPageInfos(params.uid))

  const {
    document,
    /* documentFileInfos, */ /* documentFilesIndex, */ documentHtml,
  } = $derived(documentPageInfos)
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  <Badge>{document.denominationStructurelle}</Badge>
  {document.titres.titrePrincipal}
</h1>

<div class="mx-auto flex w-1/2 justify-end">
  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a href="https://assemblee.tricoteuses.fr/documents/{params.uid}"
            >JSON augmenté</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<section>
  <template shadowrootmode="open">
    {@html documentHtml}
  </template>
</section>
