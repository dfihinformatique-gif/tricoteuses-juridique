<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import {
    bestItemForDate,
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    slugify,
    walkContexteTexteTm,
    type JorfArticleTm,
    type LegiArticleTm,
    type LegiTexteNature,
  } from "@tricoteuses/legifrance"
  import {
    getArticleDateDebut,
    sortArticlesByDate,
    type JorfArticleExtended,
    type LegiArticleExtended,
  } from "@tricoteuses/tisseuse"

  import { goto } from "$app/navigation"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { searchContext } from "$lib/hooks/search-context.svelte.js"
  import { urlPathFromId } from "$lib/urls.js"

  import type { ArticleDisplayMode, ArticlePageInfos } from "./article.js"
  import ArticleBody from "./article-body.svelte"
  import ArticleBodyDiff from "./article-body-diff.svelte"
  import ArticleSummary from "./article-summary.svelte"
  import ContexteTexteTitre from "./contexte-texte-titre.svelte"
  import TmWithTitreArray from "./tm-with-titre-array.svelte"
  import TmWithTitreSingleton from "./tm-with-titre-singleton.svelte"

  let {
    articlePageInfos,
    displayMode = $bindable(),
    showIds = $bindable(),
  }: {
    articlePageInfos: ArticlePageInfos
    displayMode: ArticleDisplayMode
    showIds: boolean
  } = $props()
  let { article, nextArticleId, otherVersionsArticles, previousArticleId } =
    $derived(articlePageInfos)
  const date = $derived(getArticleDateDebut(article))
  const texte = $derived(article.CONTEXTE.TEXTE)
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))
  const metaCommun = $derived(article.META.META_COMMUN)
  const id = $derived(metaCommun.ID)
  const versionsArticles = $derived(
    mergeVersionsArticles(article, otherVersionsArticles),
  )
  const previousVersionArticle = $derived(
    versionsArticles[
      versionsArticles.findIndex(
        (versionArticle) => versionArticle.META.META_COMMUN.ID === id,
      ) + 1
    ],
  )

  $effect(() => {
    searchContext.legifranceTexteCid = texte["@cid"]

    return () => {
      searchContext.legifranceTexteCid = undefined
    }
  })

  function mergeVersionsArticles(
    article: JorfArticleExtended | LegiArticleExtended,
    otherArticles: Array<JorfArticleExtended | LegiArticleExtended>,
  ): Array<JorfArticleExtended | LegiArticleExtended> {
    const versionsIds = article.VERSIONS.VERSION.map(
      ({ LIEN_ART: lienArticle }) => lienArticle["@id"],
    )
    for (const otherArticle of otherArticles) {
      const otherVersionsIds = otherArticle.VERSIONS.VERSION.map(
        ({ LIEN_ART: lienArticle }) => lienArticle["@id"],
      )
      if (
        otherVersionsIds.length === versionsIds.length &&
        otherVersionsIds.every((otherVersionId) =>
          versionsIds.includes(otherVersionId),
        )
      ) {
        continue
      }
      if (
        versionsIds.at(-1)?.startsWith("JORF") &&
        !otherVersionsIds.at(-1)?.startsWith("JORF")
      ) {
        console.error(
          "TODO: Is this the good method to merge these kinds of versions arrays?",
          versionsIds,
          otherVersionsIds,
        )
        versionsIds.unshift(
          ...otherVersionsIds.filter((id) => !versionsIds.includes(id)),
        )
        continue
      }
      if (
        !versionsIds.at(-1)?.startsWith("JORF") &&
        otherVersionsIds.at(-1)?.startsWith("JORF")
      ) {
        console.error(
          "TODO: Is this the good method to merge these kinds of versions arrays?",
          versionsIds,
          otherVersionsIds,
        )
        versionsIds.push(
          ...otherVersionsIds.filter((id) => !versionsIds.includes(id)),
        )
        continue
      }
      throw Error(
        "What is the good method to merge these kinds of versions arrays?",
      )
    }

    // Now that versions are merged, sort the articles.
    const articleById = {
      [metaCommun.ID]: article,
      ...Object.fromEntries(
        otherVersionsArticles.map((otherVersionArticle) => [
          otherVersionArticle.META.META_COMMUN.ID,
          otherVersionArticle,
        ]),
      ),
    }
    return versionsIds
      .map((id) => articleById[id])
      .filter((article) => article !== undefined)
      .sort(sortArticlesByDate(getArticleDateDebut))
      .reverse()
  }
</script>

<ContexteTexteTitre {date} {texte} />

{#if texte.TM !== undefined}
  {#if metaCommun.ORIGINE === "JORF"}
    <TmWithTitreSingleton tm={texte.TM as JorfArticleTm} />
  {:else}
    <TmWithTitreArray {date} tm={texte.TM as LegiArticleTm} />
  {/if}
{/if}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Article {article.num}
</h1>

<div class="mx-auto my-6 flex justify-center space-x-2">
  <Select.Root
    onValueChange={(id: string) =>
      goto(urlPathFromId(id)!, { keepFocus: true, noScroll: true })}
    type="single"
    value={id}
  >
    <Select.Trigger>
      <ArticleSummary {article} displayMode="version" {showIds} />
    </Select.Trigger>
    <Select.Content>
      {#each versionsArticles as versionArticle}
        <Select.Item value={versionArticle.META.META_COMMUN.ID}>
          <ArticleSummary
            article={versionArticle}
            displayMode="version"
            {showIds}
          />
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger><EllipsisVerticalIcon /></DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Group>
        <DropdownMenu.Label>Affichage</DropdownMenu.Label>
        <DropdownMenu.RadioGroup bind:value={displayMode}>
          <DropdownMenu.RadioItem value="inline_diff"
            >Différences en ligne</DropdownMenu.RadioItem
          >
          <DropdownMenu.RadioItem value="side-by-side_diff"
            >Différences côte à côte</DropdownMenu.RadioItem
          >
          <DropdownMenu.RadioItem value="links">Liens</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="references"
            >Références sans liens</DropdownMenu.RadioItem
          >
        </DropdownMenu.RadioGroup>
        <DropdownMenu.CheckboxItem bind:checked={showIds}>
          Identifiants
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Group>
      <DropdownMenu.Separator />
      <DropdownMenu.Group>
        <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(id, ".md"),
              "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
            ).toString()}>Markdown dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        {#if ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")}
          <DropdownMenu.Item>
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
                    const articleTitle = `Article ${article.num ?? id}`
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
            <ExternalLinkIcon />
          </DropdownMenu.Item>
        {/if}
        <DropdownMenu.Item>
          <a href="https://legal.tricoteuses.fr/article/{id}">JSON augmenté</a>
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(id, ".json"),
              "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
            ).toString()}>JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(id, ".json"),
              "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
            ).toString()}>Références JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={texte["@nature"] === "CODE"
              ? `https://www.legifrance.gouv.fr/codes/article_lc/${id}`
              : // Show article inside full text:
                // `https://www.legifrance.gouv.fr/loda/id/${id}/`
                // Show article alone:
                id.startsWith("JORF")
                ? `https://www.legifrance.gouv.fr/jorf/article_jo/${id}/`
                : `https://www.legifrance.gouv.fr/loda/article_lc/${id}/`}
            >Légifrance</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

{#if ["inline_diff", "side-by-side_diff"].includes(displayMode)}
  {#if previousVersionArticle === undefined}
    <section class="mx-4">
      <i
        >Cette version de l'article est la première chronologiquement. Elle n'a
        pas de version la précédant avec laquelle être comparée.</i
      >
    </section>
  {:else}
    <ArticleBodyDiff
      {article}
      displayMode={displayMode as "inline_diff" | "side-by-side_diff"}
      previousArticle={previousVersionArticle}
    />
  {/if}
{:else}
  <ArticleBody articleWithLinks={articlePageInfos} {displayMode} />
{/if}

<div class="mx-auto mt-8 flex w-1/2 justify-between">
  <Button
    disabled={previousArticleId === undefined}
    href={previousArticleId === undefined
      ? undefined
      : urlPathFromId(previousArticleId)}
    variant="outline">Précédent</Button
  >
  <Button
    disabled={nextArticleId === undefined}
    href={nextArticleId === undefined
      ? undefined
      : urlPathFromId(nextArticleId)}
    variant="outline">Suivant</Button
  >
</div>
