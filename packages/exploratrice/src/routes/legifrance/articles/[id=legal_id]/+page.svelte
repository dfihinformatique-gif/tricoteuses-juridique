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
    type JorfArticleVersion,
    type LegiArticleTm,
    type LegiArticleVersion,
    type LegiTexteNature,
  } from "@tricoteuses/legifrance"
  import type {
    JorfArticleExtended,
    LegiArticleExtended,
  } from "@tricoteuses/tisseuse"

  import { goto } from "$app/navigation"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryArticlePageInfos } from "../../article.remote.js"
  import ArticleBody from "../../ArticleBody.svelte"
  import ArticleSummary from "../../ArticleSummary.svelte"
  import ContexteTexteTitre from "../../ContexteTexteTitre.svelte"
  import TmWithTitreArray from "../../TmWithTitreArray.svelte"
  import TmWithTitreSingleton from "../../TmWithTitreSingleton.svelte"

  let { params } = $props()

  const articlePageInfos = $derived(await queryArticlePageInfos(params.id))
  const { article, nextArticleId, otherVersionsArticles, previousArticleId } =
    $derived(articlePageInfos)
  const texte = $derived(article.CONTEXTE.TEXTE)
  // TOOD: Improve date detection:
  const date = $derived(texte["@date_publi"]!)
  let displayMode: "links" | "references" = $state("links")
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))
  const metaCommun = $derived(article.META.META_COMMUN)
  let showIds = $state(false)
  const versionsArticles = $derived(
    mergeVersions(article, otherVersionsArticles),
  )

  function mergeVersions(
    article: JorfArticleExtended | LegiArticleExtended,
    otherArticles: Array<JorfArticleExtended | LegiArticleExtended>,
  ): Array<JorfArticleExtended | LegiArticleExtended> {
    const versions = article.VERSIONS.VERSION as Array<
      JorfArticleVersion | LegiArticleVersion
    >
    const versionsIds = versions.map(
      ({ LIEN_ART: lienArticle }) => lienArticle["@id"],
    )
    for (const otherArticle of otherArticles) {
      const otherVersions = otherArticle.VERSIONS.VERSION
      const otherVersionsIds = otherVersions.map(
        ({ LIEN_ART: lienArticle }) => lienArticle["@id"],
      )
      if (
        otherVersionsIds.length === versionsIds.length &&
        otherVersionsIds.every((otherVersionId) =>
          versionsIds.includes(otherVersionId),
        )
      ) {
        // Arrays versions & otherVersions are considered to be the same.
        continue
      }
      if (
        versionsIds.at(-1)?.startsWith("JORF") &&
        !otherVersionsIds.at(-1)?.startsWith("JORF")
      ) {
        console.error(
          "TODO: Is this the good method to merge these kinds of versions arrays?",
        )
        versions.unshift(...otherVersions)
        versionsIds.unshift(...otherVersionsIds)
        continue
      }
      if (
        !versionsIds.at(-1)?.startsWith("JORF") &&
        otherVersionsIds.at(-1)?.startsWith("JORF")
      ) {
        console.error(
          "TODO: Is this the good method to merge these kinds of versions arrays?",
        )
        versions.push(...otherVersions)
        versionsIds.push(...otherVersionsIds)
        continue
      }
      throw Error(
        "What is the good method to merge these kinds of versions arrays?",
      )
    }
    const sortedVersions = sortVersions(versions)

    // Now that versions are sorted, sort the articles in the same order.
    const articleById = {
      [metaCommun.ID]: article,
      ...Object.fromEntries(
        otherVersionsArticles.map((otherVersionArticle) => [
          otherVersionArticle.META.META_COMMUN.ID,
          otherVersionArticle,
        ]),
      ),
    }
    return sortedVersions.map(
      ({ LIEN_ART: lienArticle }) => articleById[lienArticle["@id"]],
    )
  }

  /*
   * Corrects the sorting of article versions, taking advantage of the fact that,
   * with rare exceptions, they are already well sorted.
   */
  function sortVersions<
    T extends {
      LIEN_ART: {
        "@debut": string
        "@fin": string
        "@id": string
      }
    },
  >(versions: T[]): T[] {
    versions = [...versions]
    let previousVersion = versions[0]
    for (const [index, version] of versions.slice(1).entries()) {
      const { LIEN_ART: lienArt } = version
      if (lienArt["@id"].startsWith("JORF")) {
        // Une version JORF d'un article est présente au plus un fois et toujours à la fin.
        previousVersion = version
      } else {
        const { LIEN_ART: previousLienArt } = previousVersion
        if (
          lienArt["@debut"] < previousLienArt["@debut"] ||
          (lienArt["@debut"] === previousLienArt["@debut"] &&
            lienArt["@fin"] < previousLienArt["@fin"])
        ) {
          versions[index] = version
          versions[index + 1] = previousVersion
        } else {
          previousVersion = version
        }
      }
    }

    // Move last JORF article to first position.
    if (versions.at(-1)?.LIEN_ART["@id"].startsWith("JORF")) {
      versions.unshift(versions.pop()!)
    }

    return versions.reverse()
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
    onValueChange={(id: string) => goto(urlPathFromId(id)!)}
    type="single"
    value={params.id}
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
              gitPathFromId(params.id, ".md"),
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
                    const articleTitle = `Article ${article.num ?? params.id}`
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
          <a href="https://legal.tricoteuses.fr/article/{params.id}"
            >JSON augmenté</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(params.id, ".json"),
              "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
            ).toString()}>JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          <a
            href={new URL(
              gitPathFromId(params.id, ".json"),
              "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
            ).toString()}>Références JSON dans git</a
          >
          <ExternalLinkIcon />
        </DropdownMenu.Item>
        <DropdownMenu.Item>
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
          <ExternalLinkIcon />
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<ArticleBody articleWithLinks={articlePageInfos} {displayMode} />

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
