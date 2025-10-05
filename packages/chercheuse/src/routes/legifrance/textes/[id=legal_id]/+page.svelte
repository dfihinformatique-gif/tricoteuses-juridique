<script lang="ts">
  import { error } from "@sveltejs/kit"
  import {
    gitPathFromId,
    organizationNameByTexteNature,
    repositoryNameFromTitle,
    type JorfTexteVersion,
    type LegiTexteNature,
    type LegiTexteVersion,
  } from "@tricoteuses/legifrance"

  import Structure from "../../Structure.svelte"
  import { queryTexteWithLinks } from "../../texte.remote.js"

  let { params } = $props()

  const texteWithLinks = $derived(
    (await queryTexteWithLinks(params.id)) ?? error(404, "Texte non trouvé"),
  )
  const { textelr, texteVersion } = $derived(texteWithLinks)
  const abro = $derived(texteWithLinks.abro ?? texteVersion?.ABRO?.CONTENU)
  const metaCommun = $derived(texteVersion?.META.META_COMMUN)
  const metaTexteVersion = $derived(
    texteVersion?.META.META_SPEC.META_TEXTE_VERSION,
  )
  const nota = $derived(
    texteWithLinks.nota ?? (texteVersion as LegiTexteVersion).NOTA?.CONTENU,
  )
  const notice = $derived(
    texteWithLinks.notice ?? (texteVersion as JorfTexteVersion).NOTICE?.CONTENU,
  )
  const signataires = $derived(
    texteWithLinks.signataires ??
      (texteVersion as LegiTexteVersion).SIGNATAIRES?.CONTENU,
  )
  const sm = $derived(
    texteWithLinks.sm ?? (texteVersion as JorfTexteVersion).SM?.CONTENU,
  )
  const tp = $derived(texteWithLinks.tp ?? texteVersion?.TP?.CONTENU)
  const visas = $derived(
    texteWithLinks.visas ?? (texteVersion as LegiTexteVersion).VISAS?.CONTENU,
  )
</script>

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  {texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}
</h1>

{#if abro !== undefined}
  <section class="prose ml-4">
    {@html abro}
  </section>
{/if}

{#if notice !== undefined}
  <section class="prose ml-4">
    {@html notice}
  </section>
{/if}

{#if sm !== undefined}
  <h2>Résumé</h2>
  <section class="prose ml-4">
    {@html sm}
  </section>
{/if}

{#if textelr?.STRUCT !== undefined}
  <Structure structure={textelr.STRUCT} />
{/if}

{#if signataires !== undefined}
  <section class="prose ml-4">
    {@html signataires}
  </section>
{/if}

{#if nota !== undefined}
  <h2>Nota</h2>
  <section class="prose ml-4">
    {@html nota}
  </section>
{/if}

{#if tp !== undefined}
  <section class="prose ml-4">
    {@html tp}
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
    {#if metaCommun !== undefined && metaTexteVersion !== undefined && ["CODE", "CONSTITUTION", "DECLARATION"].includes(metaCommun.NATURE ?? "")}
      <li>
        <a
          href={new URL(
            "README.md",
            `https://git.tricoteuses.fr/${organizationNameByTexteNature[metaCommun.NATURE as LegiTexteNature]}/${repositoryNameFromTitle(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? metaCommun.ID)}/src/branch/main/`,
          ).toString()}>Markdown chronologique dans git</a
        >
      </li>
    {/if}
    <li>
      <a
        href={metaCommun !== undefined && metaCommun.NATURE === "CODE"
          ? `https://www.legifrance.gouv.fr/codes/texte_lc/${params.id}`
          : `https://www.legifrance.gouv.fr/loda/id/${params.id}/`}
        >Légifrance</a
      >
    </li>
  </ul>
</details>
