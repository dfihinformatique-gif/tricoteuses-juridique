<script lang="ts">
  import { session } from "$app/stores"

  const title = $session.title
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<main>
  <div class="hero bg-base-200">
    <div class="hero-content flex-col lg:flex-row">
      <img
        alt="Les Tricoteuses jacobines ou de Robespierre"
        class="max-w-sm rounded-lg shadow-2xl"
        src="/tricoteuses_jacobines_1301x1907.jpg"
      />
      <div>
        <h1 class="text-5xl font-bold">Tricoteuses</h1>
        <p class="py-6">
          Un site et des API pour permettre aux développeurs d'utiliser plus
          facilement les données publiques légales de la <abbr
            title="Direction de l'information légale et administrative"
            >DILA</abbr
          >
          diffusées sur <a href="https://www.legifrance.gouv.fr/">Légifrance</a>
        </p>
        <a class="btn btn-primary" href="/recherche">Commencer</a>
      </div>
    </div>
  </div>
</main>
