<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"

  import type { ArticleDisplayMode } from "../../article.js"
  import { queryArticlePageInfos } from "../../article.remote.js"
  import Article from "../../article.svelte"

  let { params } = $props()

  const articlePageInfos = $derived(await queryArticlePageInfos(params.id))
  let displayMode: ArticleDisplayMode = $state("links")
  let showIds = $state(false)
</script>

{#if articlePageInfos === undefined}
  <PageBreadcrumb
    segments={[
      { label: "Textes promulgués", href: "/legifrance/textes" },
      { label: `Article ${params.id}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Article {params.id} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: "Textes promulgués", href: "/legifrance/textes" },
      {
        label: "Texte",
        href: urlPathFromId(articlePageInfos.article.CONTEXTE.TEXTE["@cid"]),
      },
      { label: `Article ${articlePageInfos.article.num ?? params.id}` },
    ]}
  />
  <Article {articlePageInfos} bind:displayMode bind:showIds />
{/if}
