<script lang="ts">
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { error } from "@sveltejs/kit"
  import {
    bestItemForDate,
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    slugify,
    walkContexteTexteTm,
    type JorfArticleTm,
    type LegiArticle,
    type LegiArticleMetaArticle,
    type LegiArticleTm,
    type LegiTexteNature,
  } from "@tricoteuses/legifrance"

  import { goto } from "$app/navigation"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { Label } from "$lib/components/ui/label/index.js"
  import * as Select from "$lib/components/ui/select/index.js"
  import { cleanHtmlContenu } from "$lib/strings.js"
  import { urlPathFromId } from "$lib/urls.js"

  import { queryArticlePageInfos } from "../../article.remote.js"
  import ContexteTexteTitre from "../../ContexteTexteTitre.svelte"
  import HtmlFragmentWithReferences from "../../HtmlFragmentWithReferences.svelte"
  import TmWithTitreArray from "../../TmWithTitreArray.svelte"
  import TmWithTitreSingleton from "../../TmWithTitreSingleton.svelte"

  let { params } = $props()

  const articlePageInfos = $derived(
    (await queryArticlePageInfos(params.id)) ??
      error(404, "Article non trouvé"),
  )
  const { article, nextArticleId, previousArticleId } =
    $derived(articlePageInfos)
  const blocTextuel = $derived(
    articlePageInfos.blocTextuel ?? article.BLOC_TEXTUEL?.CONTENU,
  )
  const texte = $derived(article.CONTEXTE.TEXTE)
  // TOOD: Improve date detection:
  const date = $derived(texte["@date_publi"]!)
  let displayMode: "links" | "references" = $state("links")
  const foundTitreTxt = $derived(bestItemForDate(texte.TITRE_TXT, date))
  const metaArticle = $derived(article.META.META_SPEC.META_ARTICLE)
  const nota = $derived(
    articlePageInfos.nota ?? (article as LegiArticle).NOTA?.CONTENU,
  )
  const versions = $derived(article.VERSIONS.VERSION)
</script>

<ContexteTexteTitre {date} {texte} />

{#if texte.TM !== undefined}
  {#if article.META.META_COMMUN.ORIGINE === "JORF"}
    <TmWithTitreSingleton tm={texte.TM as JorfArticleTm} />
  {:else}
    <TmWithTitreArray {date} tm={texte.TM as LegiArticleTm} />
  {/if}
{/if}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  Article {metaArticle.NUM}
</h1>

<div class="mx-auto flex w-1/2 justify-between">
  <div class="flex space-x-1">
    <Label for="versions">Versions</Label>
    <Select.Root
      onValueChange={(id: string) => goto(urlPathFromId(id)!)}
      type="single"
    >
      <Select.Trigger id="versions"
        >{params.id}
        {metaArticle.DATE_DEBUT} - {metaArticle.DATE_FIN}
        {(metaArticle as LegiArticleMetaArticle).ETAT}</Select.Trigger
      >
      <Select.Content>
        {#each versions as version}
          {@const lien = version.LIEN_ART}
          <Select.Item value={lien["@id"]}
            >{lien["@id"]}
            {lien["@debut"]} - {lien["@fin"]}
            {lien["@etat"] ?? version["@etat"]}</Select.Item
          >
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
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
            <ExternalLinkIcon />
          </DropdownMenu.Item>
        {/if}
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

{#if blocTextuel !== undefined}
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(blocTextuel)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences fragment={article.BLOC_TEXTUEL!.CONTENU} />
    </section>
  {/if}
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  {#if displayMode === "links"}
    <section class="prose prose-links ml-4">
      {@html cleanHtmlContenu(nota)}
    </section>
  {:else}
    <section class="prose prose-links ml-4">
      <HtmlFragmentWithReferences
        fragment={(article as LegiArticle).NOTA!.CONTENU}
      />
    </section>
  {/if}
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
