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
    <h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
      {$page.data.appTitle}
      Légifrance
    </h1>
    <p class="py-6">
      Un site et des API pour permettre aux développeurs d'utiliser plus
      facilement les <a
        class="text-blue-500 underline hover:decoration-2"
        href="https://www.dila.premier-ministre.gouv.fr/repertoire-des-informations-publiques/les-donnees-juridiques"
        >données publiques légales de la <abbr
          title="Direction de l'information légale et administrative">DILA</abbr
        ></a
      >
      diffusées sur
      <a
        class="text-blue-500 underline hover:decoration-2"
        href="https://www.legifrance.gouv.fr/">Légifrance</a
      >
    </p>
  </Hero>
</main>
