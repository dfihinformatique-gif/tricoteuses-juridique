<script lang="ts">
  import { Hero } from "@tricoteuses/explorer-tools"

  import { page } from "$app/stores"
  import { appMenu } from "$lib/legal"
</script>

<main>
  <Hero
    contributeUrl="https://git.en-root.org/tricoteuses/tricoteuses-legal-explorer"
    summaryMenu={appMenu}
    title={$page.data.appTitle}
  >
    <h1 class="text-5xl font-bold">
      {$page.data.appTitle}
      Légifrance
    </h1>
    <p class="py-6">
      Un site et des API pour permettre aux développeurs d'utiliser plus
      facilement les <a
        class="link link-hover link-primary"
        href="https://www.dila.premier-ministre.gouv.fr/repertoire-des-informations-publiques/les-donnees-juridiques"
        >données publiques légales de la <abbr
          title="Direction de l'information légale et administrative">DILA</abbr
        ></a
      >
      diffusées sur
      <a
        class="link link-hover link-primary"
        href="https://www.legifrance.gouv.fr/">Légifrance</a
      >
    </p>
  </Hero>
</main>
