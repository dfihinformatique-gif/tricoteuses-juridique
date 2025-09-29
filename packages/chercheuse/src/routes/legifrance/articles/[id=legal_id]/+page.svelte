<script lang="ts">
  import { error } from "@sveltejs/kit"
  import { getArticleWithLinks } from "../../article.remote.js"
  import type { LegiArticle } from "@tricoteuses/legifrance"

  let { params } = $props()

  const articleWithLinks = $derived(
    (await getArticleWithLinks(params.id)) ?? error(404, "Article non trouvé"),
  )
  const { article } = $derived(articleWithLinks)
  const blocTextuel = $derived(
    articleWithLinks.blocTextuel ?? article.BLOC_TEXTUEL?.CONTENU,
  )
  const metaArticle = $derived(article.META.META_SPEC.META_ARTICLE)
  const nota = $derived(
    articleWithLinks.nota ?? (article as LegiArticle).NOTA?.CONTENU,
  )
</script>

<h1>
  Article {metaArticle.NUM} ({metaArticle.DATE_DEBUT}-{metaArticle.DATE_FIN})
</h1>

{#if blocTextuel !== undefined}
  <section class="prose ml-4">
    {@html blocTextuel}
  </section>
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  <section class="prose ml-4">
    {@html nota}
  </section>
{/if}
