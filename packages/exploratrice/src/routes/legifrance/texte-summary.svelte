<script lang="ts">
  import type {
    JorfTexteVersion,
    LegiMetaTexteVersion,
    LegiTexteVersion,
  } from "@tricoteuses/legifrance"

  import { fullDateFormatter } from "$lib/dates"

  let {
    texteVersion,
    displayMode,
    showIds,
  }: {
    texteVersion: JorfTexteVersion | LegiTexteVersion
    displayMode: "texte" | "version"
    showIds: boolean
  } = $props()

  const metaCommun = $derived(texteVersion.META.META_COMMUN)
  const metaTexteChronicle = $derived(
    texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE,
  )
  const metaTexteVersion = $derived(
    texteVersion.META.META_SPEC.META_TEXTE_VERSION,
  )
  const dateDebut = $derived(metaTexteVersion.DATE_DEBUT)
  const dateFin = $derived(metaTexteVersion.DATE_FIN)
  const espace = " "
  const etat = $derived((metaTexteVersion as LegiMetaTexteVersion).ETAT)
</script>

{#if showIds}
  <code>{metaCommun.ID}</code>
{/if}
{#if metaCommun.ORIGINE === "JORF"}
  {#if displayMode === "texte"}
    Texte {metaTexteChronicle.NUM ?? ""} promulgué
  {:else}
    Version promulguée
  {/if}
{:else if displayMode === "texte"}
  Texte {metaTexteChronicle.NUM ?? ""} consolidé
{:else}
  Version consolidée
{/if}
{#if etat === "MODIFIE_MORT_NE"}
  {#if displayMode === "texte"}
    <b>mort-né</b>
  {:else}
    <b>mort-née</b>
  {/if}
{:else if etat === "VIGUEUR"}
  <b>en vigueur</b>
{:else if etat === "VIGUEUR_DIFF"}
  <b>en vigueur différée</b>
{/if}
{#if dateDebut === undefined || dateDebut === "2999-01-01"}
  le {fullDateFormatter(metaTexteChronicle.DATE_TEXTE)}
{:else if dateDebut === "2222-02-22"}
  dans le futur
{:else if dateFin === undefined || dateFin === "2999-01-01"}
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
      {#if displayMode === "texte"}
        <b>abrogé</b>
      {:else}
        <b>abrogée</b>
      {/if}
    {:else if etat === "PERIME"}
      {#if displayMode === "texte"}
        <b>périmé</b>
      {:else}
        <b>périmée</b>
      {/if}
    {:else if displayMode === "texte"}
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
