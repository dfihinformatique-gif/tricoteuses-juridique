<script lang="ts">
  import type { LegiArticleMetaArticle } from "@tricoteuses/legifrance"
  import type {
    JorfArticleExtended,
    LegiArticleExtended,
  } from "@tricoteuses/tisseuse"

  import { fullDateFormatter } from "$lib/dates"

  let {
    article,
    displayMode,
    showIds,
  }: {
    article: JorfArticleExtended | LegiArticleExtended
    displayMode: "article" | "version"
    showIds: boolean
  } = $props()

  const metaArticle = $derived(article.META.META_SPEC.META_ARTICLE)
  const dateDebut = $derived(metaArticle.DATE_DEBUT)
  const dateFin = $derived(metaArticle.DATE_FIN)
  const espace = " "
  const etat = $derived((metaArticle as LegiArticleMetaArticle).ETAT)
  const metaCommun = $derived(article.META.META_COMMUN)
</script>

{#if showIds}
  <code>{metaCommun.ID}</code>
{/if}
{#if metaCommun.ORIGINE === "JORF"}
  {#if displayMode === "article"}
    Article {article.num ?? ""} promulgué
  {:else}
    Version promulguée
  {/if}
{:else if metaCommun.ORIGINE === "LEGI" && metaArticle.TYPE !== undefined && ["ENTIEREMENT_MODIF", "PARTIELLEMENT_MODIF"].includes(metaArticle.TYPE)}
  {#if displayMode === "article"}
    Article {article.num ?? ""} de versement
  {:else}
    Version de versement
  {/if}
{:else if displayMode === "article"}
  Article {article.num ?? ""} consolidé
{:else}
  Version consolidée
{/if}
{#if etat === "MODIFIE_MORT_NE"}
  {#if displayMode === "article"}
    <b>mort-né</b>
  {:else}
    <b>mort-née</b>
  {/if}
{:else if etat === "VIGUEUR"}
  <b>en vigueur</b>
{:else if etat === "VIGUEUR_DIFF"}
  <b>en vigueur différée</b>
{/if}
{#if dateDebut === "2999-01-01"}
  {@const contexteTexte = article.CONTEXTE.TEXTE}
  {@const titreTexte = contexteTexte.TITRE_TXT}
  {@const dateSignature =
    contexteTexte["@date_signature"] ??
    (titreTexte === undefined
      ? []
      : Array.isArray(titreTexte)
        ? titreTexte
        : [titreTexte]
    ).sort((titreTexte1, titreTexte2) =>
      titreTexte1["@debut"].localeCompare(titreTexte2["@debut"]),
    )[0]?.["@debut"]}
  {#if dateSignature !== undefined && dateSignature !== "2999-01-01"}
    le {fullDateFormatter(dateSignature)}
  {/if}
{:else if dateDebut === "2222-02-22"}
  dans le futur
{:else if dateFin === "2999-01-01"}
  {#if etat?.endsWith("_DIFF")}
    à partir du
  {:else}
    depuis le
  {/if}
  {fullDateFormatter(dateDebut)}
{:else if dateFin <= dateDebut}
  le {fullDateFormatter(dateDebut)}
{:else}
  du {fullDateFormatter(
    dateDebut,
  )}{#if ["ABROGE", "ABROGE_DIFF", "PERIME", "TRANSFERE"].includes(etat ?? "")},
    {#if ["ABROGE", "ABROGE_DIFF"].includes(etat ?? "")}
      {#if displayMode === "article"}
        <b>abrogé</b>
      {:else}
        <b>abrogée</b>
      {/if}
    {:else if etat === "PERIME"}
      {#if displayMode === "article"}
        <b>périmé</b>
      {:else}
        <b>périmée</b>
      {/if}
    {:else if displayMode === "article"}
      <b>transféré</b>
    {:else}
      <b>transférée</b>
    {/if}
    {#if dateFin === "2222-02-22"}
      à une date future
    {:else}
      le {fullDateFormatter(dateFin)}
    {/if}
  {:else}
    {espace}
    {#if dateFin === "2222-02-22"}
      à une date future
    {:else}
      au {fullDateFormatter(dateFin)}
    {/if}
  {/if}
{/if}
{#if etat !== undefined && !["ABROGE", "ABROGE_DIFF", "MODIFIE", "MODIFIE_MORT_NE", "PERIME", "TRANSFERE", "VIGUEUR", "VIGUEUR_DIFF"].includes(etat)}
  <b>{etat}</b>
{/if}
