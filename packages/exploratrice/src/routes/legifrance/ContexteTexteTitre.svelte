<script lang="ts">
  import {
    bestItemForDate,
    type JorfArticle,
    type JorfSectionTa,
    type LegiArticle,
    type LegiSectionTa,
  } from "@tricoteuses/legifrance"
  import { cleanTexteTitle } from "@tricoteuses/tisseuse"

  import { urlPathFromId } from "$lib/urls"

  let {
    date,
    texte,
  }: {
    date: string
    texte:
      | JorfArticle["CONTEXTE"]["TEXTE"]
      | JorfSectionTa["CONTEXTE"]["TEXTE"]
      | LegiSectionTa["CONTEXTE"]["TEXTE"]
      | LegiArticle["CONTEXTE"]["TEXTE"]
  } = $props()

  const titreTexte = $derived(bestItemForDate(texte.TITRE_TXT, date))
</script>

<h2
  class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
>
  {#if titreTexte === undefined}
    Texte sans titre
  {:else}
    <a href={urlPathFromId(titreTexte["@id_txt"])}
      >{cleanTexteTitle(titreTexte["#text"] ?? titreTexte["@c_titre_court"]) ??
        "Texte sans titre"}</a
    >
  {/if}
</h2>
