<script lang="ts">
  import type {
    JorfArticle,
    JorfSectionTa,
    LegiArticle,
    LegiSectionTa,
  } from "@tricoteuses/legifrance"

  import { urlPathFromId } from "$lib/urls"

  let {
    texte,
  }: {
    texte:
      | JorfArticle["CONTEXTE"]["TEXTE"]
      | JorfSectionTa["CONTEXTE"]["TEXTE"]
      | LegiSectionTa["CONTEXTE"]["TEXTE"]
      | LegiArticle["CONTEXTE"]["TEXTE"]
  } = $props()

  const titresTexte = $derived(texte.TITRE_TXT)
</script>

<h2
  class="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0"
>
  {#if titresTexte === undefined}
    Texte sans titre
  {:else if titresTexte.length === 1}
    {@const titreTexte = titresTexte[0]}
    <a href={urlPathFromId(titreTexte["@id_txt"])}
      >{(titreTexte["#text"] ?? titreTexte["@c_titre_court"])
        ?.replace(/\s+/g, " ")
        .trim() ?? "Texte sans titre"}</a
    >
  {:else}
    {#each titresTexte as titreTexte, index}
      {#if index > 0}
        <br />
      {/if}
      <a href={urlPathFromId(titreTexte["@id_txt"])}
        >{(titreTexte["#text"] ?? titreTexte["@c_titre_court"])
          ?.replace(/\s+/g, " ")
          .trim() ?? "Texte sans titre"}
        {titreTexte["@debut"] === "2999-01-01" &&
        titreTexte["@fin"] === "2999-01-01"
          ? ""
          : titreTexte["@fin"] === "2999-01-01"
            ? ` (depuis le ${titreTexte["@debut"]})`
            : ` (du ${titreTexte["@debut"]} au ${titreTexte["@debut"]})`}</a
      >
    {/each}
  {/if}
</h2>
