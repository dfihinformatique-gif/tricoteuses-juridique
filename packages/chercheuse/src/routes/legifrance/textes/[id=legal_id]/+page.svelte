<script lang="ts">
  import { error } from "@sveltejs/kit"

  import Structure from "../../Structure.svelte"
  import { getTexteWithLinks } from "../../texte.remote.js"
  import type {
    JorfTexteVersion,
    LegiTexteVersion,
  } from "@tricoteuses/legifrance"

  let { params } = $props()

  const texteWithLinks = $derived(
    (await getTexteWithLinks(params.id)) ?? error(404, "Texte non trouvé"),
  )
  const { textelr, texteVersion } = $derived(texteWithLinks)
  const abro = $derived(texteWithLinks.abro ?? texteVersion?.ABRO?.CONTENU)
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

<h1>{texteVersion?.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}</h1>

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
