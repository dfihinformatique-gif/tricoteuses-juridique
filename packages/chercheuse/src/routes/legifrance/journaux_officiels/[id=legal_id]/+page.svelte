<script lang="ts">
  import { error } from "@sveltejs/kit"
  import { gitPathFromId } from "@tricoteuses/legifrance"

  import { getJo } from "../../jo.remote.js"

  let { params } = $props()

  const jo = $derived(
    (await getJo(params.id)) ?? error(404, "Journal officiel non trouvé"),
  )
  const metaCommun = $derived(jo.META.META_COMMUN)
  const metaConteneur = $derived(jo.META.META_SPEC.META_CONTENEUR)
</script>

TODO

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
    {#if metaConteneur.NUM !== undefined}
      <li>
        <a
          href={`https://www.legifrance.gouv.fr/jorf/jo/${metaConteneur.DATE_PUBLI.replaceAll("-", "/")}/${`0000${metaConteneur.NUM}`.slice(-4)}`}
          >Légifrance</a
        >
      </li>
    {/if}
  </ul>
</details>
