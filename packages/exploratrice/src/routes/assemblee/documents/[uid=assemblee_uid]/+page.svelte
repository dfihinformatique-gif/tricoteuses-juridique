<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"

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

<section>
  <template shadowrootmode="open">
    {@html documentHtml}
  </template>
</section>
