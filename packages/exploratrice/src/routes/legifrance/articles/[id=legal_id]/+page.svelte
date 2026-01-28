<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { urlPathFromId } from "$lib/urls.js"
  import * as m from "$lib/paraglide/messages.js"

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
      { label: m.legifrance_textes_list_breadcrumb(), href: "/legifrance/textes" },
      { label: `${m.legifrance_article_heading({ num: params.id })}` },
    ]}
  />
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{m.error_not_found({ item: m.legifrance_article_heading({ num: params.id }) })}</Alert.Title>
  </Alert.Root>
{:else}
  <PageBreadcrumb
    segments={[
      { label: m.legifrance_textes_list_breadcrumb(), href: "/legifrance/textes" },
      {
        label: m.legifrance_texte_menu_trigger(),
        href: articlePageInfos.article.CONTEXTE.TEXTE["@cid"]
          ? (urlPathFromId(articlePageInfos.article.CONTEXTE.TEXTE["@cid"]) ??
            undefined)
          : undefined,
      },
      { label: `${m.legifrance_article_heading({ num: articlePageInfos.article.num ?? params.id })}` },
    ]}
  />
  <Article {articlePageInfos} bind:displayMode bind:showIds />
{/if}
