<script lang="ts">
  import { error } from "@sveltejs/kit"
  import {
    bestItemForDate,
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    slugify,
    walkContexteTexteTm,
    type LegiArticle,
    type LegiTexteNature,
  } from "@tricoteuses/legifrance"

  import ContexteTexteTitre from "../../ContexteTexteTitre.svelte"
  import { getArticleWithLinks } from "../../article.remote.js"
  import HtmlFragmentWithReferences from "../../HtmlFragmentWithReferences.svelte"
  import TmWithTitreSingleton from "../../TmWithTitreSingleton.svelte"

  let { params } = $props()

  const articleWithLinks = $derived(
    (await getArticleWithLinks(params.id)) ?? error(404, "Article non trouvé"),
  )
  const { article } = $derived(articleWithLinks)
  const blocTextuel = $derived(
    articleWithLinks.blocTextuel ?? article.BLOC_TEXTUEL?.CONTENU,
  )
  const texte = $derived(article.CONTEXTE.TEXTE)
  // TOOD: Improve date detection:
  const date = $derived(texte["@date_publi"]!)
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))
  const metaArticle = $derived(article.META.META_SPEC.META_ARTICLE)
  const nota = $derived(
    articleWithLinks.nota ?? (article as LegiArticle).NOTA?.CONTENU,
  )
</script>

<ContexteTexteTitre {texte} />

{#if texte.TM !== undefined}
  <TmWithTitreSingleton tm={texte.TM} />
{/if}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Article {metaArticle.NUM} ({metaArticle.DATE_DEBUT} - {metaArticle.DATE_FIN})
</h1>

{#if blocTextuel !== undefined}
  <section class="prose ml-4">
    {@html blocTextuel}
  </section>

  <section class="prose ml-4">
    <HtmlFragmentWithReferences fragment={article.BLOC_TEXTUEL?.CONTENU!} />
  </section>
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  <section class="prose ml-4">
    {@html nota}
  </section>
{/if}

<details>
  <summary><h2>Autres formats</h2></summary>

  <ul>
    <li>
      <a
        href={new URL(
          gitPathFromId(params.id, ".json"),
          "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
        ).toString()}>JSON dans git</a
      >
    </li>
    <li>
      <a
        href={new URL(
          gitPathFromId(params.id, ".json"),
          "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
        ).toString()}>Références JSON dans git</a
      >
    </li>
    <li>
      <a
        href={new URL(
          gitPathFromId(params.id, ".md"),
          "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
        ).toString()}>Markdown dans git</a
      >
    </li>
    {#if ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")}
      <li>
        <a
          href={new URL(
            [
              ...(texte.TM === undefined
                ? []
                : walkContexteTexteTm(texte.TM)
              ).map((tm) => {
                const titreTm = tm.TITRE_TM
                const foundTitreTm = Array.isArray(titreTm)
                  ? bestItemForDate(titreTm, date)!
                  : titreTm
                const sectionTaTitle =
                  foundTitreTm["#text"]?.replace(/\s+/g, " ").trim() ??
                  `Section sans titre ${foundTitreTm["@id"]}`
                let sectionTaSlug = slugify(
                  sectionTaTitle.split(":")[0].trim(),
                  "_",
                )
                if (sectionTaSlug.length > 255) {
                  sectionTaSlug = sectionTaSlug.slice(0, 254)
                  if (sectionTaSlug.at(-1) !== "_") {
                    sectionTaSlug += "_"
                  }
                }
                return sectionTaSlug
              }),
              (() => {
                const articleTitle = `Article ${metaArticle.NUM ?? params.id}`
                let articleSlug = slugify(articleTitle, "_")
                if (articleSlug.length > 252) {
                  articleSlug = articleSlug.slice(0, 251)
                  if (articleSlug.at(-1) !== "_") {
                    articleSlug += "_"
                  }
                }
                return `${articleSlug}.md`
              })(),
            ].join("/"),
            `https://git.tricoteuses.fr/${organizationNameByTexteNature[texte["@nature"] as LegiTexteNature]}/${repositoryNameFromTitle(foundTitreTxt?.["#text"] ?? foundTitreTxt?.["@c_titre_court"] ?? texte["@cid"]!)}/src/branch/main/`,
          ).toString()}>Markdown chronologique dans git</a
        >
      </li>
    {/if}
    <li>
      <a
        href={texte["@nature"] === "CODE"
          ? `https://www.legifrance.gouv.fr/codes/article_lc/${params.id}`
          : // Show article inside full text:
            // `https://www.legifrance.gouv.fr/loda/id/${params.id}/`
            // Show article alone:
            params.id.startsWith("JORF")
            ? `https://www.legifrance.gouv.fr/jorf/article_jo/${params.id}/`
            : `https://www.legifrance.gouv.fr/loda/article_lc/${params.id}/`}
        >Légifrance</a
      >
    </li>
  </ul>
</details>
